import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

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

export async function renderCard({ eyebrow, headline, headlineSize = 112, detail, badge, footer }: CardProps) {
  const [semiBold, regular] = await Promise.all([
    readFile(join(process.cwd(), "src/assets/fonts/Poppins-SemiBold.ttf")),
    readFile(join(process.cwd(), "src/assets/fonts/Poppins-Regular.ttf")),
  ]);

  // The site card shows a large logo; page cards shrink it to make room.
  const barHeight = eyebrow ? 40 : 128;
  const barUnit = barHeight / 3.2;

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
          {LOGO_COLORS.map((color, i) => (
            <div
              key={color}
              style={{ width: barUnit * [4, 2, 1][i], height: barHeight, marginRight: barUnit * 0.4, background: color }}
            />
          ))}
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
          <div style={{ display: "flex", color: INK, fontWeight: 600 }}>koinscan.com</div>
        </div>
      </div>
    ),
    {
      ...cardSize,
      fonts: [
        { name: "Poppins", data: semiBold, weight: 600, style: "normal" },
        { name: "Poppins", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
