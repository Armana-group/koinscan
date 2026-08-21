import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const minimumSafeVersion = [7, 5, 5] as const;

function parseVersion(version: string): [number, number, number] {
  const parts = version.split('.').map((part) => Number.parseInt(part, 10));

  assert.equal(parts.length, 3, `Expected semver version, received ${version}`);
  parts.forEach((part) => assert.ok(Number.isInteger(part), `Invalid version component in ${version}`));

  return parts as [number, number, number];
}

function isAtLeast(version: string, minimum: readonly [number, number, number]): boolean {
  const parsed = parseVersion(version);

  for (let index = 0; index < minimum.length; index += 1) {
    if (parsed[index] > minimum[index]) return true;
    if (parsed[index] < minimum[index]) return false;
  }

  return true;
}

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  resolutions?: Record<string, string>;
};

const yarnLock = readFileSync(new URL('../yarn.lock', import.meta.url), 'utf8');
const protobufEntries = Array.from(
  yarnLock.matchAll(/^protobufjs@[\s\S]*?^  version "([^"]+)"/gm),
  (match) => match[1],
);

assert.ok(protobufEntries.length > 0, 'Expected yarn.lock to contain protobufjs entries');

const vulnerableEntries = protobufEntries.filter((version) => !isAtLeast(version, minimumSafeVersion));
assert.deepEqual(vulnerableEntries, [], 'All protobufjs lockfile entries must be >= 7.5.5');

assert.match(
  packageJson.devDependencies?.protobufjs ?? packageJson.dependencies?.protobufjs ?? '',
  /^\^?7\.(?:[6-9]|\d{2,})\.|^\^?7\.5\.(?:[5-9]|\d{2,})/,
  'Direct protobufjs dependency should require a patched 7.x version',
);

assert.equal(
  packageJson.resolutions?.protobufjs,
  '7.6.2',
  'Yarn resolutions should force transitive protobufjs copies to 7.6.2',
);

console.log(`protobufjs lockfile versions are patched: ${[...new Set(protobufEntries)].join(', ')}`);
