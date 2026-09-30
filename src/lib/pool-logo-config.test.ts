import assert from "node:assert/strict";
import { test } from "node:test";
import { hasLocalMatch } from "next/dist/shared/lib/match-local-pattern";
import { hasRemoteMatch } from "next/dist/shared/lib/match-remote-pattern";
import config from "../../next.config.mjs";

test("the image optimizer refuses API images through relative and absolute URLs", () => {
  const path = "/api/pool-logo/1GGxRhLN7Ek54xycG5XaZBE4bCgwV2xtvk";
  assert.equal(hasLocalMatch(config.images.localPatterns, path), false);
  assert.equal(hasRemoteMatch([], config.images.remotePatterns, new URL(`https://koinscan.com${path}`)), false);
  assert.equal(hasRemoteMatch([], config.images.remotePatterns, new URL("https://arbitrary.example/image.png")), false);
});

test("existing static and explicitly allowed token images still match", () => {
  assert.equal(hasLocalMatch(config.images.localPatterns, "/koinscan-logo.png"), true);
  assert.equal(hasLocalMatch(config.images.localPatterns, "/_next/static/media/wallet.abc.png"), true);
  assert.equal(hasRemoteMatch([], config.images.remotePatterns, new URL("https://koinscan.com/koinscan-logo.png")), true);
  assert.equal(hasRemoteMatch([], config.images.remotePatterns, new URL("https://raw.githubusercontent.com/koindx/token-list/main/src/images/mainnet/koin.png")), true);
});
