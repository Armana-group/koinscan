import { lookup } from "node:dns/promises";
import type { LookupAddress } from "node:dns";
import { request } from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import { isIP, type LookupFunction } from "node:net";
import type { Readable } from "node:stream";
import { spawn } from "node:child_process";
import { join } from "node:path";
import ipaddr from "ipaddr.js";
// Keep the child decoder's native dependency closure in Next's route trace.
// Image parsing itself only takes place in the killable worker.
import "sharp";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 5_000;
const RASTER_TYPES = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);

export function validateLogoUrl(value: string): URL {
  if (value.length > 2_048) throw new Error("Logo URL is too long");
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    throw new Error("Logo must use HTTPS on the standard port without credentials");
  }
  return url;
}

export function isPublicAddress(address: string): boolean {
  try {
    const ip = ipaddr.process(address);
    return ip.range() === "unicast" && (ip.kind() === "ipv4" || ip.match(ipaddr.parseCIDR("2000::/3")));
  } catch {
    return false;
  }
}

/** Pin the socket lookup to the validated answers; never resolve the host twice. */
export async function createPinnedLookup(
  hostname: string,
  resolve: (host: string) => Promise<LookupAddress[]> = (host) => lookup(host, { all: true, verbatim: true }),
): Promise<LookupFunction> {
  const host = hostname.replace(/^\[|\]$/g, "");
  const family = isIP(host);
  const addresses = family ? [{ address: host, family }] : await resolve(host);
  if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new Error("Logo destination must be public");
  }
  return (_host, options, callback) => {
    if (options.all) callback(null, addresses);
    else callback(null, addresses[0].address, addresses[0].family);
  };
}

export async function readImageBody(response: Readable & { statusCode?: number; headers: IncomingHttpHeaders }): Promise<Buffer> {
  try {
    const type = response.headers["content-type"]?.split(";")[0].trim().toLowerCase();
    if (response.statusCode !== 200 || !type || !RASTER_TYPES.has(type)) {
      throw new Error("Logo must return a raster image without redirects");
    }
    const encoding = response.headers["content-encoding"];
    if ((encoding && encoding !== "identity") || Number(response.headers["content-length"]) > MAX_IMAGE_BYTES) {
      throw new Error("Logo response exceeds limits");
    }
    const chunks: Buffer[] = [];
    let bytes = 0;
    for await (const chunk of response) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      bytes += buffer.length;
      if (bytes > MAX_IMAGE_BYTES) throw new Error("Logo response exceeds limits");
      chunks.push(buffer);
    }
    return Buffer.concat(chunks, bytes);
  } finally {
    response.destroy();
  }
}

function hasRasterSignature(input: Buffer): boolean {
  return input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    input.subarray(0, 3).equals(Buffer.from([255, 216, 255])) ||
    ["GIF87a", "GIF89a"].includes(input.toString("ascii", 0, 6)) ||
    (input.toString("ascii", 0, 4) === "RIFF" && input.toString("ascii", 8, 12) === "WEBP");
}

function spawnThumbnailWorker() {
  return spawn(process.execPath, ["--max-old-space-size=64", join(process.cwd(), "src/lib/pool-logo-worker.mjs")], {
    stdio: ["pipe", "pipe", "ignore"],
  });
}

export async function renderPoolThumbnail(input: Buffer, startWorker = spawnThumbnailWorker): Promise<Buffer> {
  if (input.length > MAX_IMAGE_BYTES || !hasRasterSignature(input)) throw new Error("Unsupported logo input");
  // Sharp's timeout covers output evaluation, not all header/metadata parsing.
  // A child lets us enforce a wall deadline over the entire native conversion.
  return new Promise((resolve, reject) => {
    const child = startWorker();
    const chunks: Buffer[] = [];
    let bytes = 0;
    let failure: Error | undefined;
    const stop = (error: Error) => { failure = error; child.kill("SIGKILL"); };
    const timer = setTimeout(() => stop(new Error("Logo processing timed out")), 3_000);
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 64 * 1024) stop(new Error("Logo thumbnail exceeds limits"));
      else chunks.push(chunk);
    });
    child.on("error", (error) => { failure = error; });
    child.stdin.on("error", (error) => { failure = error; });
    // Resolve only after exit, so the service never releases a slot while a
    // timed-out decoder is still running. V8's heap limit is not a native cap.
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failure || code !== 0 || bytes === 0) reject(failure ?? new Error("Invalid logo image"));
      else resolve(Buffer.concat(chunks, bytes));
    });
    child.stdin.end(input);
  });
}

export async function fetchPoolThumbnail(value: string): Promise<Buffer> {
  const url = validateLogoUrl(value);
  const signal = AbortSignal.timeout(IMAGE_TIMEOUT_MS);
  const download = async () => {
    const pinnedLookup = await createPinnedLookup(url.hostname);
    signal.throwIfAborted();
    return new Promise<Buffer>((resolve, reject) => {
      // A fresh socket prevents reuse of a connection resolved under another policy.
      // node:https does not follow redirects and sends no visitor cookies or headers.
      const req = request(url, {
        agent: false,
        lookup: pinnedLookup,
        signal,
        headers: { Accept: "image/png,image/jpeg,image/webp,image/gif" },
      }, (response) => { readImageBody(response).then(resolve, reject); });
      req.on("error", reject);
      req.end();
    });
  };
  // DNS lookup itself cannot be cancelled; its late result must never open a socket.
  let onAbort!: () => void;
  const aborted = new Promise<never>((_resolve, reject) => {
    onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
  });
  try {
    return await renderPoolThumbnail(await Promise.race([download(), aborted]));
  } finally {
    signal.removeEventListener("abort", onAbort);
  }
}
