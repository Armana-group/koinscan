// The address this deployment is served from, for link previews and absolute
// URLs. The public beta sets SITE_URL=https://beta.koinscan.io so shared beta
// links show the beta's own card, not the main site's.
export const SITE_URL = new URL(process.env.SITE_URL || "https://koinscan.com");
