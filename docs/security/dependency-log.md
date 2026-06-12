# Koinscan Dependency Log

Last updated: 2026-06-03

This log records the packages that are most relevant to Koinscan's security posture. Update it when bumping these packages or changing install-script policy.

| Package | Current version | Why it matters | Install scripts | Current note |
|---|---:|---|---|---|
| `next` | `16.1.0` | App framework, middleware, image optimizer, server runtime | None | Audit currently reports framework/transitive advisories; upgrade to the latest compatible 16.x patch and re-audit. |
| `@armana/walletconnect-koinos-sdk-js` | `0.1.4` | WalletConnect signing and deep WalletConnect dependency tree | None in package metadata checked locally | Most `yarn audit` volume enters through this dependency tree; review before upgrades. |
| `koilib` | `9.1.1` | Koinos RPC, contracts, transaction/event decoding | None in package metadata checked locally | Pulls `protobufjs`; pinned through root `resolutions`. |
| `kondor-js` | `1.2.0` | Kondor wallet integration | None in package metadata checked locally | Keep wallet behavior manually verified after upgrades. |
| `protobufjs` | `7.6.2` | Koinos transfer-event decoding and protobuf parsing | `postinstall` | Forced with Yarn `resolutions`; `scripts/regression-protobufjs-version.ts` verifies the lockfile stays patched. |
| `sharp` | `0.33.5` | Next image optimization native dependency | `install` | Expected native install hook; CI installs with `--ignore-scripts` for security checks. |

## Install-Script Policy

Default local and CI security checks should use:

```bash
yarn install --frozen-lockfile --ignore-scripts
```

Only `sharp` and `protobufjs` are currently expected to need install/postinstall behavior. Re-check package metadata before adding new native packages.
