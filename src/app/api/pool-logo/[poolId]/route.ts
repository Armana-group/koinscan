import { createPoolLogoService } from "@/lib/pool-logo";
import { fetchPoolThumbnail } from "@/lib/pool-logo-image";
import { readPoolLogoUrl, readPoolRegistry } from "@/lib/pool-logo-registry";

export const runtime = "nodejs";
export const maxDuration = 30;
const logos = createPoolLogoService({ readRegistry: readPoolRegistry, readLogoUrl: readPoolLogoUrl, fetchThumbnail: fetchPoolThumbnail });

export async function GET(request: Request, { params }: { params: Promise<{ poolId: string }> }) {
  // No arbitrary URL, size, quality, or cache-busting parameters are accepted.
  if (new URL(request.url).search) return new Response(null, { status: 400 });
  const { poolId } = await params;
  const result = await logos.get(poolId);
  const headers: Record<string, string> = { "X-Content-Type-Options": "nosniff" };
  if (result.status === 200 && result.body) {
    headers["Content-Type"] = "image/webp";
    headers["Cache-Control"] = "public, max-age=300, s-maxage=300";
    // Already normalized; the browser receives no remote URL or embedded SVG.
    return new Response(new Uint8Array(result.body), { headers });
  }
  headers["Cache-Control"] = "no-store";
  if (result.status === 429 || result.status === 503) headers["Retry-After"] = "30";
  return new Response(null, { status: result.status, headers });
}
