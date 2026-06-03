import assert from 'node:assert/strict';
import nextConfig from '../next.config.mjs';
import packageJson from '../package.json';

const env = nextConfig.env ?? {};

assert.equal(
  env.NEXT_PUBLIC_APP_VERSION,
  packageJson.version,
  'Next config should expose the package version as NEXT_PUBLIC_APP_VERSION',
);

assert.match(
  env.NEXT_PUBLIC_BUILD_COMMIT ?? '',
  /^[0-9a-f]{7,40}$|^unknown$/,
  'Next config should expose a short git commit or unknown as NEXT_PUBLIC_BUILD_COMMIT',
);

console.log(
  `Build version metadata: v${env.NEXT_PUBLIC_APP_VERSION} · ${env.NEXT_PUBLIC_BUILD_COMMIT}`,
);
