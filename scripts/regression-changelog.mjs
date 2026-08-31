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
assert.match(
  changelog.html,
  /More reliable contract interactions/,
  "Julian's contract explorer improvements are documented",
);
assert.match(
  changelog.html,
  /Julian Gonzalez/,
  "the contract explorer improvements credit their contributor",
);
assert.match(
  changelog.html,
  /993b052/,
  "the first contract explorer commit is linked",
);
assert.match(
  changelog.html,
  /002fe20/,
  "the second contract explorer commit is linked",
);
assert.match(
  changelog.html,
  /Reliable blockchain requests and safer administration/,
  "the June reliability release is documented",
);
assert.match(
  changelog.html,
  /Correct transfers and resilient account history/,
  "the June history repairs are documented",
);
assert.match(
  changelog.html,
  /Clearer transaction history and accurate balances/,
  "the January history and balance release is documented",
);

const home = await fetchPage("/");
assert.equal(home.status, 200, "the home page remains reachable");
assert.match(
  home.html,
  /href="\/changelog"[^>]*>Changelog</,
  "the global footer links to the public changelog",
);

console.log("public changelog regression passed");
