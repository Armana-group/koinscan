import { isIP } from "node:net";

/**
 * Server-side checks for the pool logo route. Pool owners set their logo URL
 * on-chain, so the URL is untrusted input: these helpers decide what the
 * route is willing to fetch and serve.
 */

export const POOL_LOGO_MAX_BYTES = 1_000_000;

export type PoolLogoType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";

/** The image type from the file's first bytes. The Content-Type header is not trusted. */
export function sniffImageType(bytes: Uint8Array): PoolLogoType | null {
  const startsWith = (signature: number[], offset = 0) =>
    bytes.length >= offset + signature.length &&
    signature.every((byte, index) => bytes[offset + index] === byte);

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x47, 0x49, 0x46, 0x38])) return "image/gif";
  // "RIFF" <size> "WEBP"
  if (startsWith([0x52, 0x49, 0x46, 0x46]) && startsWith([0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

/**
 * The logo URL if the route may fetch it: https on the default port, a
 * hostname rather than an IP literal, and no credentials.
 */
export function parseLogoUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (url.port !== "" && url.port !== "443") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "" || isIP(host) !== 0 || host === "localhost" || host.endsWith(".localhost")) return null;
  return url;
}

function ipv4Octets(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : NaN));
  return octets.every((octet) => octet >= 0 && octet <= 255) ? octets : null;
}

/** True for loopback, private, link-local, CGNAT, multicast and other non-public addresses. */
export function isPrivateAddress(address: string): boolean {
  const v4 = ipv4Octets(address);
  if (v4) {
    const [a, b] = v4;
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0 && v4[2] === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  const v6 = address.toLowerCase();
  if (isIP(v6) !== 6) return true; // not an address we understand: refuse
  if (v6 === "::" || v6 === "::1") return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateAddress(mapped[1]);
  return (
    v6.startsWith("fc") ||
    v6.startsWith("fd") ||
    /^fe[89ab]/.test(v6) ||
    v6.startsWith("ff") ||
    v6.startsWith("64:ff9b:")
  );
}

/** Reads a response body, or returns null as soon as it grows past `maxBytes`. */
export async function readCapped(
  body: ReadableStream<Uint8Array>,
  maxBytes: number
): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
