import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";
export const alt =
  "WoW Forever Community Discord - Alliance and Horde, PvE, PvP and Roleplay";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage(): Promise<ImageResponse> {
  const [background, logo] = await Promise.all([
    sharp(path.join(process.cwd(), "public/images/forever-hero.webp"))
      .resize(1200, 630, { fit: "cover", position: "centre" })
      .png()
      .toBuffer(),
    readFile(path.join(process.cwd(), "public/images/wow-forever-logo.png")),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        backgroundColor: "#0c0d10",
        position: "relative",
        color: "#f1f2f4",
        fontFamily: "sans-serif",
      }}
    >
      {/* ImageResponse requires standard img elements for embedded image data. */}
      <img
        src={`data:image/png;base64,${background.toString("base64")}`}
        alt=""
        width={1200}
        height={630}
        style={{ position: "absolute", inset: 0, objectFit: "cover" }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(8,10,16,.05), rgba(8,10,16,.2) 45%, rgba(8,10,16,.75))",
        }}
      />
      <div
        style={{
          padding: "44px 40px",
          width: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          position: "absolute",
          right: 0,
          top: 0,
        }}
      >
        <img
          src={`data:image/png;base64,${logo.toString("base64")}`}
          alt="WoW Forever"
          width={300}
          height={244}
        />
        <div style={{ fontSize: 46, fontWeight: 700, marginTop: 18 }}>
          Community Discord
        </div>
        <div style={{ fontSize: 21, marginTop: 20, color: "#e0e4eb" }}>
          Find your guild. Share the adventure.
        </div>
        <div style={{ fontSize: 20, color: "#e0b95b", marginTop: 24 }}>
          Alliance &amp; Horde · PvE · PvP · Roleplay
        </div>
        <div style={{ fontSize: 17, marginTop: 30, color: "#e0e4eb" }}>
          wowforeverdiscord.online
        </div>
        <div style={{ fontSize: 14, marginTop: 12, color: "#c9ced7" }}>
          Independent, unofficial fan community
        </div>
      </div>
    </div>,
    size,
  );
}
