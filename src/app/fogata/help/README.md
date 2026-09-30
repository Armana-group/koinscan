# Maintaining the Fogata guide

Edit `public/fogata-guide.md`. It is the canonical user documentation and the self-contained LLM reference file. `/fogata/help` renders that same file at build time; `/fogata-guide.md` serves the download. There is no separate copy to update.

When changing it:

1. Keep headings plain text and distinct. Update the Contents links and any in-app links if a heading changes; anchors use lowercase text, remove punctuation, and replace spaces with hyphens.
2. Update the guide date and version when its instructions change. Check wallet labels against Koinscan, protocol claims against Koinos documentation, and accounting claims against the relevant Fogata contract revision.
3. Keep examples explicitly illustrative. Do not embed live balances, prices, or projected payouts as fixed facts. Describe transaction approval and confirmation separately.
4. Keep the LLM guidance and sources in the downloadable file. It must make sense without the website or access to a wallet.
5. Run `yarn lint`, `yarn build`, and `FOGATA_UI_BASE_URL=http://localhost:3333 yarn fogata-ui:regression` with the local server running. Check the page, section links, and Markdown download in the browser at desktop and mobile sizes.

Screen recordings are a separate follow-up. Capture real wallet and app flows with approved demonstration accounts, then add links beside the matching topics. Do not show wallet recovery material. Recheck text instructions whenever the recorded interface changes.
