import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const footerSource = readFileSync(new URL('../src/components/Footer.tsx', import.meta.url), 'utf8');

assert.match(
  footerSource,
  /flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1/,
  'Footer copyright/version row should align mixed text sizes by baseline',
);

assert.match(
  footerSource,
  /<p className="leading-none">/,
  'Footer copyright text should use a stable line-height for baseline alignment',
);

assert.match(
  footerSource,
  /className="text-xs leading-none text-muted-foreground\/60"/,
  'Footer version text should use the same stable line-height as the copyright text',
);

console.log('Footer version stamp alignment classes are present');
