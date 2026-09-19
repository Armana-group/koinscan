import assert from "node:assert/strict";

const baseUrl = process.env.BETA_STATUS_BASE_URL || "http://localhost:3002";
const warning = "This is an early beta version. Some features may not work as expected.";

const response = await fetch(baseUrl);
const html = await response.text();

assert.equal(response.status, 200, "the home page is reachable");

const footerStart = html.indexOf("<footer");
const warningStart = html.indexOf(warning);
const secondWarningStart = html.indexOf(warning, warningStart + warning.length);

assert.notEqual(footerStart, -1, "the rendered page includes its global footer");
assert.ok(warningStart > footerStart, "the beta warning is rendered inside the footer");
assert.equal(secondWarningStart, -1, "the beta warning is rendered exactly once");
assert.match(
  html.slice(0, footerStart),
  />BETA</,
  "the site navigation identifies the product as beta beside its logo",
);

const logoLabelStart = html.indexOf('aria-label="KoinScan home"');
const logoLinkStart = html.lastIndexOf("<a", logoLabelStart);
const logoLinkEnd = html.indexOf("</a>", logoLabelStart);

assert.ok(logoLabelStart > -1 && logoLabelStart < footerStart, "the navbar logo has an accessible name");
assert.ok(logoLinkStart > -1 && logoLinkEnd > logoLabelStart, "the navbar logo is rendered as a link");
assert.match(
  html.slice(logoLinkStart, logoLinkEnd),
  /href="\/"/,
  "the navbar logo links to the home page",
);

console.log("beta status placement regression passed");
