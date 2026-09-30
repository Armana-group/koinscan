import assert from "node:assert/strict";
import { test } from "node:test";
import { Readable } from "node:stream";
import { spawn } from "node:child_process";
import sharp from "sharp";
import { createPinnedLookup, isPublicAddress, readImageBody, renderPoolThumbnail, validateLogoUrl } from "./pool-logo-image";

test("logo URLs require HTTPS without credentials or custom ports", () => {
  for (const url of ["http://example.com/a.png", "https://user:pass@example.com/a", "https://example.com:8443/a", "not a URL"]) {
    assert.throws(() => validateLogoUrl(url));
  }
  assert.equal(validateLogoUrl("https://example.com/a.png").hostname, "example.com");
});

test("only public unicast destinations are accepted, including mapped IPv4", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "100.64.0.1", "192.0.2.1", "224.0.0.1", "::1", "fc00::1", "fe80::1", "::ffff:127.0.0.1", "2001:db8::1", "2002:7f00:1::", "64:ff9b::7f00:1"]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  for (const address of ["8.8.8.8", "1.1.1.1", "2606:4700:4700::1111"]) {
    assert.equal(isPublicAddress(address), true, address);
  }
});

test("DNS is checked once and the connection uses that same public address", async () => {
  let calls = 0;
  const lookup = await createPinnedLookup("images.example", async () => {
    calls++;
    return [{ address: "8.8.8.8", family: 4 }];
  });
  const address = await new Promise((resolve, reject) => lookup("images.example", {}, (error, result) => error ? reject(error) : resolve(result)));
  assert.equal(address, "8.8.8.8");
  assert.equal(calls, 1);
  await assert.rejects(createPinnedLookup("images.example", async () => [
    { address: "8.8.8.8", family: 4 }, { address: "127.0.0.1", family: 4 },
  ]));
});

test("redirects, non-images and oversized streamed bodies are rejected", async () => {
  const body = (statusCode: number, contentType: string, chunks: Buffer[]) => Object.assign(Readable.from(chunks), { statusCode, headers: { "content-type": contentType } });
  await assert.rejects(readImageBody(body(302, "image/png", [])));
  await assert.rejects(readImageBody(body(200, "text/html", [Buffer.from("hello")])));
  await assert.rejects(readImageBody(body(200, "image/svg+xml", [Buffer.from("<svg/>")])));
  await assert.rejects(readImageBody(body(200, "image/png", [Buffer.alloc(2 * 1024 * 1024), Buffer.alloc(1)])));
  assert.deepEqual(await readImageBody(body(200, "image/png", [Buffer.from("abc")])), Buffer.from("abc"));
});

test("only decoded raster images become small, fixed WebP thumbnails", async () => {
  const png = await sharp({ create: { width: 200, height: 100, channels: 3, background: "red" } }).png().toBuffer();
  const output = await renderPoolThumbnail(png);
  const meta = await sharp(output).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 96);
  assert.equal(meta.height, 96);
  await assert.rejects(renderPoolThumbnail(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'/>")));
  await assert.rejects(renderPoolThumbnail(Buffer.from("not an image")));
  const huge = await sharp({ create: { width: 5000, height: 4000, channels: 3, background: "red" } }).png().toBuffer();
  await assert.rejects(renderPoolThumbnail(huge));
});

test("a stalled decoder is killed and exited before its slot can be released", async () => {
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "red" } }).png().toBuffer();
  const child = spawn(process.execPath, ["-e", "process.stdin.resume(); setInterval(() => {}, 1000)"], { stdio: ["pipe", "pipe", "ignore"] });
  await assert.rejects(renderPoolThumbnail(png, () => child), /timed out/);
  assert.equal(child.signalCode, "SIGKILL");
});

test("decoder output is capped even if a worker returns too much data", async () => {
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: "red" } }).png().toBuffer();
  const child = spawn(process.execPath, ["-e", "process.stdout.write(Buffer.alloc(100000)); process.stdin.resume()"], { stdio: ["pipe", "pipe", "ignore"] });
  await assert.rejects(renderPoolThumbnail(png, () => child), /exceeds limits/);
});
