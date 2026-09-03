import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";

export async function GET() {
  const bytecode = await readFile(
    path.join(process.cwd(), "src", "koinos", "wasm", "miningpool.wasm")
  );

  return new Response(bytecode, {
    headers: {
      "Content-Type": "application/wasm",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
