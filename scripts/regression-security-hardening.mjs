import { readFileSync, existsSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const assertions = [];

function assert(name, condition) {
  assertions.push({ name, condition });
}

const adminRoute = read('src/app/api/admin/whitelist/route.ts');
const betaAccessConfig = read('src/config/beta-access.ts');
const betaAccessLib = read('src/lib/beta-access.ts');
const nextConfig = read('next.config.mjs');
const eslintConfig = read('eslint.config.mjs');
const securityWorkflow = read('.github/workflows/security.yml');
const gitleaksConfig = existsSync('.gitleaks.toml') ? read('.gitleaks.toml') : '';
const tsconfig = JSON.parse(read('tsconfig.json'));
const yarnrc = existsSync('.yarnrc') ? read('.yarnrc') : '';
const packageJson = JSON.parse(read('package.json'));
const constants = read('src/koinos/constants.ts');

assert(
  'admin whitelist route does not authorize with public wallet bearer addresses',
  !adminRoute.includes("authHeader.replace('Bearer ', '')") &&
    !adminRoute.includes('authHeader.replace("Bearer ", "")') &&
    !adminRoute.includes('hasWalletAccess(adminWallet)'),
);

assert(
  'admin whitelist route requires a server-side admin token',
  adminRoute.includes('KOISCAN_ADMIN_API_TOKEN') &&
    adminRoute.includes('timingSafeEqual') &&
    adminRoute.includes('requireAdminAccess'),
);

assert(
  'admin whitelist GET is not public enumeration',
  adminRoute.includes('export async function GET(request: Request)') &&
    adminRoute.includes('requireAdminAccess(request)'),
);

assert(
  'admin whitelist validates actions and wallet identifiers before writing',
  adminRoute.includes('VALID_ACTIONS') &&
    adminRoute.includes('isValidWhitelistEntry') &&
    adminRoute.includes('normalizeWalletEntry'),
);

assert(
  'client whitelist management helpers do not imply wallet bearer auth',
  !betaAccessConfig.includes('addWalletToWhitelist') &&
    !betaAccessConfig.includes('removeWalletFromWhitelist'),
);

assert(
  'beta access cookie is not client-set as an authorization artifact',
  !betaAccessLib.includes('document.cookie = `${BETA_ACCESS_KEY}=${JSON.stringify(accessState)}'),
);

assert(
  'image optimizer does not allow wildcard http or https hosts',
  !nextConfig.includes("hostname: '**'") &&
    !nextConfig.includes('hostname: "**"') &&
    !nextConfig.includes("protocol: 'http'") &&
    !nextConfig.includes('protocol: "http"'),
);

assert(
  'baseline security headers are configured',
  nextConfig.includes('async headers()') &&
    nextConfig.includes('Content-Security-Policy') &&
    nextConfig.includes('X-Frame-Options') &&
    nextConfig.includes('Strict-Transport-Security'),
);

assert(
  'production builds do not ignore TypeScript errors',
  !nextConfig.includes('ignoreBuildErrors: true'),
);

assert(
  'WalletConnect metadata identifies Koinscan',
  constants.includes('name: "Koinscan"') &&
    constants.includes('url: "https://koinscan.com"') &&
    !constants.includes('My-dApp1') &&
    !constants.includes('https://example.com'),
);

assert('Node runtime is pinned', existsSync('.nvmrc') || existsSync('.node-version'));
assert('Yarn install scripts are disabled by default', yarnrc.includes('ignore-scripts true'));
assert('security dependency log exists', existsSync('docs/security/dependency-log.md'));
assert('GitHub security workflow exists', existsSync('.github/workflows/security.yml'));

assert(
  'security workflow uses open-source Gitleaks CLI instead of licensed action wrapper',
  !securityWorkflow.includes('gitleaks/gitleaks-action') &&
    securityWorkflow.includes('ghcr.io/gitleaks/gitleaks') &&
    securityWorkflow.includes('detect --source="/repo"') &&
    securityWorkflow.includes('--verbose --redact'),
);

assert(
  'security workflow uses the repo Gitleaks config',
  securityWorkflow.includes('--config="/repo/.gitleaks.toml"'),
);

assert(
  'Gitleaks config allowlists local investigation logs',
  existsSync('.gitleaks.toml') &&
    gitleaksConfig.includes('[[allowlists]]') &&
    gitleaksConfig.includes('local-docs/'),
);

assert(
  'gitignored nested koinosblocks project is excluded from TypeScript checks',
  tsconfig.exclude?.includes('koinosblocks'),
);

assert(
  'gitignored nested koinosblocks project is excluded from ESLint checks',
  eslintConfig.includes('"koinosblocks/**"'),
);

assert(
  'package exposes security regression script',
  packageJson.scripts?.['security:regression'] === 'node scripts/regression-security-hardening.mjs',
);

const failures = assertions.filter((item) => !item.condition);

if (failures.length > 0) {
  console.error('Security hardening regression failures:');
  for (const failure of failures) {
    console.error(`- ${failure.name}`);
  }
  process.exit(1);
}

console.log(`Security hardening regressions passed (${assertions.length} checks).`);
