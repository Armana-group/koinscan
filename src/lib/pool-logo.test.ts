import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isPrivateAddress, parseLogoUrl, readCapped, sniffImageType } from "./pool-logo";

const bytes = (...values: number[]) => new Uint8Array(values);

describe("sniffImageType", () => {
  it("recognises PNG, JPEG, GIF and WebP by their bytes", () => {
    assert.equal(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0)), "image/png");
    assert.equal(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0)), "image/jpeg");
    assert.equal(sniffImageType(new TextEncoder().encode("GIF89a")), "image/gif");
    assert.equal(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ")), "image/webp");
  });

  it("refuses SVG, HTML and anything else", () => {
    assert.equal(sniffImageType(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'>")), null);
    assert.equal(sniffImageType(new TextEncoder().encode("<!doctype html>")), null);
    assert.equal(sniffImageType(new TextEncoder().encode("RIFF\0\0\0\0WAVE")), null);
    assert.equal(sniffImageType(bytes()), null);
  });
});

describe("parseLogoUrl", () => {
  it("accepts https URLs on a hostname", () => {
    assert.equal(parseLogoUrl(" https://iili.io/logo.png ")?.hostname, "iili.io");
    assert.ok(parseLogoUrl("https://example.com:443/a.webp"));
  });

  it("refuses http, other ports, credentials, IP literals and localhost", () => {
    for (const url of [
      "http://example.com/logo.png",
      "https://example.com:8443/logo.png",
      "https://user:pass@example.com/logo.png",
      "https://127.0.0.1/logo.png",
      "https://[::1]/logo.png",
      "https://169.254.169.254/latest/meta-data",
      "https://localhost/logo.png",
      "https://app.localhost/logo.png",
      "data:image/png;base64,AAAA",
      "not a url",
      "",
    ]) {
      assert.equal(parseLogoUrl(url), null, url);
    }
  });
});

describe("isPrivateAddress", () => {
  it("flags loopback, private, link-local, CGNAT and multicast ranges", () => {
    for (const address of [
      "127.0.0.1", "10.1.2.3", "172.16.0.1", "172.31.255.255", "192.168.1.1", "169.254.169.254",
      "100.64.0.1", "0.0.0.0", "224.0.0.1", "::1", "::", "fd00::1", "fe80::1", "::ffff:10.0.0.1",
      "64:ff9b::a00:1",
    ]) {
      assert.equal(isPrivateAddress(address), true, address);
    }
  });

  it("lets public addresses through", () => {
    for (const address of ["8.8.8.8", "172.32.0.1", "100.128.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"]) {
      assert.equal(isPrivateAddress(address), false, address);
    }
  });
});

describe("readCapped", () => {
  const stream = (...chunks: Uint8Array[]) =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        chunks.forEach((chunk) => controller.enqueue(chunk));
        controller.close();
      },
    });

  it("joins the chunks when the body fits", async () => {
    assert.deepEqual(await readCapped(stream(bytes(1, 2), bytes(3)), 3), bytes(1, 2, 3));
  });

  it("gives up once the body passes the cap", async () => {
    assert.equal(await readCapped(stream(bytes(1, 2), bytes(3, 4)), 3), null);
  });
});
