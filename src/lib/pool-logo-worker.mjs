// Standalone decoder process, included in the pool-logo route's deployment trace.
import sharp from "sharp";
sharp.cache(false);
sharp.concurrency(1);

async function main() {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of process.stdin) {
    bytes += chunk.length;
    if (bytes > 2 * 1024 * 1024) throw new Error("Input exceeds limits");
    chunks.push(chunk);
  }
  const result = await sharp(Buffer.concat(chunks), { limitInputPixels: 16_000_000, animated: false })
    .timeout({ seconds: 3 })
    .rotate()
    .resize(96, 96, { fit: "contain", background: "#00000000" })
    .webp({ quality: 80 })
    .toBuffer();
  if (result.length > 64 * 1024) throw new Error("Output exceeds limits");
  process.stdout.write(result);
}
main().catch(() => { process.exitCode = 1; });
