import assert from "node:assert/strict";
import { test } from "node:test";
import { createPoolLogoService } from "./pool-logo";

const pool = "18DmHs6kCnr4E9Rr2Hcvm3YfXhiQ9wBuNq";
const unknown = "15jueaBcMieDCMGw6wAmEK6cNSUVicknG1";

function setup(overrides = {}) {
  let registryCalls = 0;
  let logoCalls = 0;
  let fetchCalls = 0;
  let time = 0;
  const service = createPoolLogoService({
    readRegistry: async () => { registryCalls++; return new Set([pool]); },
    readLogoUrl: async () => { logoCalls++; return "https://images.example/logo.png"; },
    fetchThumbnail: async () => { fetchCalls++; return Buffer.from("thumbnail"); },
    now: () => time,
    ...overrides,
  });
  return { service, calls: () => ({ registryCalls, logoCalls, fetchCalls }), advance: (ms: number) => { time += ms; } };
}

test("malformed and unregistered pools never trigger a logo fetch", async () => {
  const { service, calls } = setup();
  assert.equal((await service.get("https://arbitrary.example/image")).status, 400);
  assert.equal((await service.get(unknown)).status, 404);
  assert.deepEqual(calls(), { registryCalls: 1, logoCalls: 0, fetchCalls: 0 });
});

test("concurrent requests share registry and thumbnail work, then use the cache", async () => {
  const { service, calls, advance } = setup();
  const results = await Promise.all([service.get(pool), service.get(pool)]);
  assert.equal(results[0].status, 200);
  assert.deepEqual(results[0].body, Buffer.from("thumbnail"));
  await service.get(pool);
  assert.deepEqual(calls(), { registryCalls: 1, logoCalls: 1, fetchCalls: 1 });
  advance(300_001);
  await service.get(pool);
  assert.deepEqual(calls(), { registryCalls: 2, logoCalls: 2, fetchCalls: 2 });
});

test("failed images are cached briefly without caching them as successful images", async () => {
  let attempts = 0;
  const { service, advance } = setup({ fetchThumbnail: async () => { attempts++; throw new Error("bad image"); } });
  assert.equal((await service.get(pool)).status, 502);
  assert.equal((await service.get(pool)).status, 502);
  assert.equal(attempts, 1);
  advance(30_001);
  await service.get(pool);
  assert.equal(attempts, 2);
});

test("registry failures fail closed and repeated requests wait before retrying", async () => {
  let attempts = 0;
  const { service, advance, calls } = setup({ readRegistry: async () => { attempts++; throw new Error("offline"); } });
  assert.equal((await service.get(pool)).status, 503);
  assert.equal((await service.get(unknown)).status, 503);
  assert.equal(attempts, 1);
  assert.equal(calls().logoCalls, 0);
  advance(10_001);
  await service.get(pool);
  assert.equal(attempts, 2);
});

test("a fifth cold logo waits for capacity and eventually loads", async () => {
  const pools = Array.from({ length: 5 }, (_, i) => pool + String(i + 1));
  let release!: (value: Buffer) => void;
  const pending = new Promise<Buffer>((resolve) => { release = resolve; });
  let started = 0;
  const { service } = setup({ readRegistry: async () => new Set(pools), fetchThumbnail: async () => { started++; return pending; } });
  const work = pools.slice(0, 4).map((id) => service.get(id));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 4);
  const fifth = service.get(pools[4]);
  release(Buffer.from("thumbnail"));
  await Promise.all(work);
  assert.equal((await fifth).status, 200);
  assert.equal(started, 5);
});

test("waiting work and the per-minute fetch budget stay bounded", async () => {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const pools = [...alphabet].map((letter) => pool + letter);
  let release!: (value: Buffer) => void;
  const pending = new Promise<Buffer>((resolve) => { release = resolve; });
  let started = 0;
  const { service, advance } = setup({ readRegistry: async () => new Set(pools), fetchThumbnail: async () => { started++; return pending; } });
  const work = pools.slice(0, 32).map((id) => service.get(id));
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(started, 4);
  assert.equal((await service.get(pools[32])).status, 429);
  release(Buffer.from("thumbnail"));
  await Promise.all(work);
  for (const id of pools.slice(32, 40)) assert.equal((await service.get(id)).status, 200);
  assert.equal((await service.get(pools[40])).status, 429);
  advance(60_001);
  assert.equal((await service.get(pools[40])).status, 200);
});

test("a queued request times out without starting a fifth conversion", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const pools = Array.from({ length: 5 }, (_, i) => pool + String(i + 1));
  let release!: (value: Buffer) => void;
  const pending = new Promise<Buffer>((resolve) => { release = resolve; });
  let started = 0;
  const { service } = setup({ readRegistry: async () => new Set(pools), fetchThumbnail: async () => { started++; return pending; } });
  const work = pools.slice(0, 4).map((id) => service.get(id));
  const fifth = service.get(pools[4]);
  await new Promise((resolve) => setImmediate(resolve));
  t.mock.timers.tick(5_001);
  assert.equal((await fifth).status, 429);
  assert.equal(started, 4);
  release(Buffer.from("thumbnail"));
  await Promise.all(work);
  assert.equal((await service.get(pools[4])).status, 200);
});
