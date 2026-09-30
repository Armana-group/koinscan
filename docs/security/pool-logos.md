# Pool logo fetching

Pool logos are served from `/api/pool-logo/<poolId>`. The endpoint accepts only a
pool identifier, verifies membership in the Fogata 2 registry, then reads that
pool's current image URL through the fixed `https://api.koinos.io` RPC endpoint.
There are no new environment variables, caller-selected nodes, sizes, or URLs.

The image request uses HTTPS on port 443, without URL credentials or visitor
headers. All DNS answers must be public; the socket uses those same validated
answers on a fresh connection. Redirects and compressed HTTP responses are
refused. Supported source formats are PNG, JPEG, WebP, and GIF; animation becomes
a static thumbnail. Other formats, including SVG, are rejected before decoding.

Limits:

- Download: 2 MiB, with a 5-second deadline including DNS and body reading.
- Registry: 2 MiB per RPC reply, 8 seconds for up to ten 100-pool pages; failure
  fails closed instead of silently accepting a partial registry.
- Pool parameters: one read with a 5-second deadline.
- Decode: 16 million input pixels; a separate child process, killed after a
  3-second wall deadline that includes header parsing. The slot remains occupied
  until the child exits. Sharp runs one conversion thread and disables its cache.
- Output: one 96-by-96 WebP, at most 64 KiB. The image optimizer cannot accept
  API paths, preventing a second arbitrary-size optimization layer.
- Per process: four active conversions, at most 32 active/waiting requests,
  and 40 new logo jobs per minute. Waiting requests have a 5-second deadline;
  duplicate requests share the same work. The route allows up to 30 seconds.
- Cache: at most 256 entries; successful thumbnails expire after 5 minutes,
  failed images after 30 seconds. Registry membership expires after 1 minute;
  failed registry refreshes wait 10 seconds before retrying. Successful HTTP
  responses also allow a 5-minute browser/CDN cache; error responses are no-store.

The component shows the letter fallback on failure and retries at 30, 60, and
120 seconds before stopping. A changed pool or image resets this state.
Updated or removed logos may remain cached for up to 5 minutes.

The deployment trace explicitly includes `src/lib/pool-logo-worker.mjs`.
The Node deployment must support child processes and include Sharp's native
dependencies. These limits are per warm instance; they are not a distributed
rate limit. V8's 64 MiB heap setting does not cap native decoder allocations,
and the wall deadline is not an OS-enforced CPU-seconds quota. A stricter global
budget or native memory cap requires an isolated image service or host controls.

Verification: `yarn test`, `yarn security:regression`, `yarn build`, and a local
production-server request for a real registered logo. Check the deployment trace
for the worker and Sharp before release, and verify a logo in the deployed preview.
