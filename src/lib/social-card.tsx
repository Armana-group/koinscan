import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/site-url";

// Draws the 1200x630 link-preview images used by the opengraph-image routes.

export const cardSize = { width: 1200, height: 630 };

// Same colors as public/koinscan-logo.svg.
const LOGO_COLORS = ["#E05252", "#E4B80C", "#522FE3"];
const INK = "#0C0A09";
const MUTED = "#57534E";
const SUBTLE = "#78716C";

interface CardProps {
  eyebrow?: string;
  headline: string;
  headlineSize?: number;
  detail?: string;
  badge?: { label: string; color: string };
  footer: string;
}

async function loadFonts() {
  const [semiBold, regular] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/Poppins-SemiBold.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/Poppins-Regular.ttf")),
  ]);
  return [
    { name: "Poppins", data: semiBold, weight: 600 as const, style: "normal" as const },
    { name: "Poppins", data: regular, weight: 400 as const, style: "normal" as const },
  ];
}

function LogoBars({ height }: { height: number }) {
  const unit = height / 3.2;
  return (
    <div style={{ display: "flex" }}>
      {LOGO_COLORS.map((color, i) => (
        <div key={color} style={{ width: unit * [4, 2, 1][i], height, marginRight: unit * 0.4, background: color }} />
      ))}
    </div>
  );
}

// The home page as a card: the same light sheet, logo-coloured glow, greeting
// and search pill, so a shared link looks like the site it opens.
export async function renderSiteCard() {
  const [medium, light] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/Poppins-Medium.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/Poppins-Light.ttf")),
  ]);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          background: "#F3F1F1",
          backgroundImage: [
            "radial-gradient(circle at 8% 0%, rgba(240,150,150,0.55), rgba(240,150,150,0) 42%)",
            "radial-gradient(circle at 96% 100%, rgba(180,160,250,0.55), rgba(180,160,250,0) 45%)",
            "radial-gradient(circle at 50% 120%, rgba(250,220,140,0.5), rgba(250,220,140,0) 40%)",
          ].join(", "),
          color: "#16121C",
          fontFamily: "Poppins",
        }}
      >
        <div style={{ position: "absolute", top: 56, left: 64, display: "flex", alignItems: "center" }}>
          <LogoBars height={34} />
          <div style={{ display: "flex", marginLeft: 12, fontSize: 32, fontWeight: 500, letterSpacing: -0.5 }}>KoinScan</div>
        </div>
        <div style={{ display: "flex", fontSize: 136, fontWeight: 500, letterSpacing: -5.5, lineHeight: 1, marginTop: 24 }}>Hello, Koinos</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 38, fontWeight: 300, color: "#5B5565", letterSpacing: -0.4 }}>Explore, mine, trade.</div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 52,
            width: 800,
            height: 84,
            padding: "0 16px 0 36px",
            borderRadius: 42,
            background: "#FFFFFF",
            boxShadow: "0 24px 60px rgba(22,18,28,0.12)",
            fontSize: 24,
            fontWeight: 300,
            color: "#6B6475",
            whiteSpace: "nowrap",
          }}
        >
          <div style={{ display: "flex" }}>Search an address, @nickname, transaction or block</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 26, background: "#E05252", opacity: 0.85 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </div>
        </div>
        <div style={{ position: "absolute", bottom: 48, display: "flex", fontSize: 24, fontWeight: 300, color: "#8F8A97" }}>{SITE_URL.host}</div>
      </div>
    ),
    {
      ...cardSize,
      fonts: [
        { name: "Poppins", data: medium, weight: 500, style: "normal" },
        { name: "Poppins", data: light, weight: 300, style: "normal" },
      ],
    },
  );
}

export async function renderCard({ eyebrow, headline, headlineSize = 112, detail, badge, footer }: CardProps) {

  // The site card shows a large logo; page cards shrink it to make room.
  const barHeight = eyebrow ? 40 : 128;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "88px 96px",
          background: "#FFFFFF",
          color: INK,
          fontFamily: "Poppins",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <LogoBars height={barHeight} />
          {eyebrow && (
            <div style={{ display: "flex", marginLeft: 16, fontSize: 34, fontWeight: 600 }}>KoinScan</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {eyebrow && (
            <div style={{ display: "flex", alignItems: "center", marginBottom: 20, fontSize: 28, color: SUBTLE, letterSpacing: 4 }}>
              {eyebrow.toUpperCase()}
              {badge && (
                <div
                  style={{
                    display: "flex",
                    marginLeft: 20,
                    padding: "4px 16px",
                    borderRadius: 8,
                    fontSize: 24,
                    letterSpacing: 2,
                    fontWeight: 600,
                    color: badge.color,
                    border: `2px solid ${badge.color}`,
                  }}
                >
                  {badge.label.toUpperCase()}
                </div>
              )}
            </div>
          )}
          <div style={{ display: "flex", fontSize: headlineSize, fontWeight: 600, letterSpacing: headlineSize >= 96 ? -4 : -1, lineHeight: 1.05 }}>
            {headline}
          </div>
          {detail && <div style={{ display: "flex", marginTop: 24, fontSize: 40, color: MUTED }}>{detail}</div>}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: SUBTLE }}>
          <div style={{ display: "flex" }}>{footer}</div>
          <div style={{ display: "flex", color: INK, fontWeight: 600 }}>{SITE_URL.host}</div>
        </div>
      </div>
    ),
    { ...cardSize, fonts: await loadFonts() },
  );
}

// Fogata is its own product that lives inside KoinScan, so its card leads
// with the Fogata mark and credits KoinScan small in the corner.
export async function renderFogataCard({ headline, detail, footer }: { headline: string; detail: string; footer: string }) {
  const mark = await readFile(join(process.cwd(), "public/fogata-mark.svg"));
  const markSrc = `data:image/svg+xml;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "88px 96px",
          background: "#FFFFFF",
          color: INK,
          fontFamily: "Poppins",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain <img> only */}
        <img src={markSrc} width={136} height={136} alt="" />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 112, fontWeight: 600, letterSpacing: -4, lineHeight: 1 }}>{headline}</div>
          <div style={{ display: "flex", marginTop: 24, fontSize: 40, color: MUTED }}>{detail}</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 28, color: SUBTLE }}>
          <div style={{ display: "flex" }}>{footer}</div>
          <div style={{ display: "flex", alignItems: "center", color: INK, fontWeight: 600 }}>
            <LogoBars height={22} />
            <div style={{ display: "flex", marginLeft: 6 }}>KoinScan</div>
          </div>
        </div>
      </div>
    ),
    { ...cardSize, fonts: await loadFonts() },
  );
}
