import assert from "node:assert/strict";

const baseUrl = process.env.CHANGELOG_BASE_URL || "http://localhost:3002";

async function fetchPage(path) {
  const response = await fetch(`${baseUrl}${path}`);
  return {
    status: response.status,
    html: await response.text(),
  };
}

const changelog = await fetchPage("/changelog");
assert.equal(changelog.status, 200, "the public changelog route is reachable");
assert.match(
  changelog.html,
  /What changed, and why it matters\./,
  "the changelog explains its purpose",
);
assert.match(
  changelog.html,
  /Accurate balances and market pricing/,
  "the accepted accuracy release is documented",
);
assert.match(
  changelog.html,
  /5d9698d/,
  "the public release points to its deployed commit",
);

const home = await fetchPage("/");
assert.equal(home.status, 200, "the home page remains reachable");
assert.match(
  home.html,
  /href="\/changelog"[^>]*>Changelog</,
  "the global footer links to the public changelog",
);

console.log("public changelog regression passed");
