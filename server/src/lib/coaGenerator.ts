import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { Response } from "express";

// ─── Brand colors (RGB) ───────────────────────────────────────────────────────
const COLORS = {
  deepNavy:  [13, 21, 40] as [number, number, number],
  arcCyan:   [0, 229, 255] as [number, number, number],
  stormGold: [255, 214, 0] as [number, number, number],
  voidPurple:[123, 47, 255] as [number, number, number],
  cardSurf:  [17, 24, 39] as [number, number, number],
  white:     [232, 244, 255] as [number, number, number],
  muted:     [58, 80, 128] as [number, number, number],
};

const RANK_LABELS: Record<string, string> = {
  IRON_I: "Iron I", BRONZE_II: "Bronze II", STEEL_III: "Steel III",
  OBSIDIAN_IV: "Obsidian IV", VOID_V: "Void V",
  INFERNO_VI: "Inferno VI", ETERNAL_VII: "Eternal VII",
};
const CLASS_LABELS: Record<string, string> = {
  BLADE: "Blade", POLEARM: "Polearm", RANGED: "Ranged",
  FORGE_ARTIFACT: "Forge Artifact", GAUNTLET: "The Gauntlet",
};

interface CoaData {
  weaponName: string;
  weaponClass: string;
  rank: string;
  mintSerial: string;
  ownerUsername: string;
  wins: number;
  losses: number;
  mintedAt: Date;
  publicUrl: string;
  recentDuels?: { challenger: string; defender: string; winnerId: string; weaponId: string }[];
}

export async function generateCoa(data: CoaData, res: Response): Promise<void> {
  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    info: {
      Title: `BattleForge Certificate of Authenticity — ${data.mintSerial}`,
      Author: "BattleForge",
    },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="BF-COA-${data.mintSerial}.pdf"`
  );
  doc.pipe(res);

  const W = doc.page.width;   // 595.28
  const H = doc.page.height;  // 841.89

  // ── Background ──────────────────────────────────────────────────────────────
  doc.rect(0, 0, W, H).fill(`rgb(${COLORS.deepNavy.join(",")})`);

  // Subtle grid pattern
  doc.save();
  doc.strokeColor(`rgb(${COLORS.cardSurf.join(",")})`, 0.6);
  for (let x = 0; x < W; x += 30) {
    doc.moveTo(x, 0).lineTo(x, H).stroke();
  }
  for (let y = 0; y < H; y += 30) {
    doc.moveTo(0, y).lineTo(W, y).stroke();
  }
  doc.restore();

  // ── Top accent bar ──────────────────────────────────────────────────────────
  const grad = doc.linearGradient(0, 0, W, 0);
  grad.stop(0, `rgb(${COLORS.voidPurple.join(",")})`);
  grad.stop(1, `rgb(${COLORS.arcCyan.join(",")})`);
  doc.rect(0, 0, W, 8).fill(grad);

  // ── Card container ──────────────────────────────────────────────────────────
  const pad = 40;
  doc
    .roundedRect(pad, 30, W - pad * 2, H - 60, 12)
    .fillAndStroke(
      `rgb(${COLORS.cardSurf.join(",")})`,
      `rgb(${COLORS.voidPurple.join(",")})`
    );

  // ── Logo / header ───────────────────────────────────────────────────────────
  doc
    .font("Helvetica-Bold")
    .fontSize(28)
    .fillColor(`rgb(${COLORS.arcCyan.join(",")})`)
    .text("BATTLEFORGE", pad + 24, 60, { align: "center", width: W - pad * 2 - 48 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(`rgb(${COLORS.muted.join(",")})`)
    .text("CERTIFICATE OF AUTHENTICITY", pad + 24, 92, {
      align: "center",
      width: W - pad * 2 - 48,
      characterSpacing: 3,
    });

  // Divider
  const divY = 112;
  doc
    .moveTo(pad + 24, divY)
    .lineTo(W - pad - 24, divY)
    .strokeColor(`rgb(${COLORS.voidPurple.join(",")})`)
    .lineWidth(1)
    .stroke();

  // ── Weapon name ─────────────────────────────────────────────────────────────
  doc
    .font("Helvetica-Bold")
    .fontSize(34)
    .fillColor(`rgb(${COLORS.white.join(",")})`)
    .text(data.weaponName.toUpperCase(), pad + 24, 128, {
      align: "center",
      width: W - pad * 2 - 48,
    });

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(`rgb(${COLORS.stormGold.join(",")})`)
    .text(
      `${RANK_LABELS[data.rank] ?? data.rank} · ${CLASS_LABELS[data.weaponClass] ?? data.weaponClass}`,
      pad + 24,
      168,
      { align: "center", width: W - pad * 2 - 48 }
    );

  // ── Stats grid ──────────────────────────────────────────────────────────────
  const statsY = 205;
  const statW = (W - pad * 2 - 48) / 3;
  const stats = [
    { label: "Victories", value: String(data.wins) },
    { label: "Owner", value: data.ownerUsername },
    { label: "Defeats", value: String(data.losses) },
  ];
  stats.forEach((s, i) => {
    const x = pad + 24 + i * statW;
    doc
      .rect(x, statsY, statW - 8, 60)
      .fillAndStroke(`rgb(${COLORS.deepNavy.join(",")})`, `rgb(${COLORS.muted.join(",")})`);
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor(`rgb(${COLORS.arcCyan.join(",")})`)
      .text(s.value, x, statsY + 8, { width: statW - 8, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(`rgb(${COLORS.muted.join(",")})`)
      .text(s.label.toUpperCase(), x, statsY + 40, {
        width: statW - 8,
        align: "center",
        characterSpacing: 1,
      });
  });

  // ── Serial section ──────────────────────────────────────────────────────────
  const serialY = 285;
  doc.lineWidth(1.5);
  doc
    .roundedRect(pad + 24, serialY, W - pad * 2 - 48, 50, 6)
    .fillAndStroke(`rgb(${COLORS.deepNavy.join(",")})`, `rgb(${COLORS.stormGold.join(",")})`);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(`rgb(${COLORS.stormGold.join(",")})`)
    .text("MINT SERIAL NUMBER", pad + 24, serialY + 8, {
      width: W - pad * 2 - 48,
      align: "center",
      characterSpacing: 2,
    });
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(`rgb(${COLORS.stormGold.join(",")})`)
    .text(data.mintSerial, pad + 24, serialY + 22, {
      width: W - pad * 2 - 48,
      align: "center",
      characterSpacing: 1,
    });

  // ── Duel history ────────────────────────────────────────────────────────────
  const histY = 352;
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(`rgb(${COLORS.muted.join(",")})`)
    .text("COMBAT HISTORY", pad + 24, histY, { characterSpacing: 2 });

  const duels = data.recentDuels?.slice(0, 5) ?? [];
  if (duels.length === 0) {
    doc
      .font("Helvetica")
      .fontSize(9)
      .fillColor(`rgb(${COLORS.muted.join(",")})`)
      .text("No recorded duels yet.", pad + 24, histY + 18);
  } else {
    duels.forEach((d, i) => {
      const rowY = histY + 18 + i * 22;
      const won = d.winnerId && d.weaponId === data.mintSerial;
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor(won ? `rgb(${[0, 255, 157].join(",")})` : `rgb(${COLORS.muted.join(",")})`)
        .text(
          `${won ? "WIN" : "LOSS"}  ${d.challenger} vs ${d.defender}`,
          pad + 24,
          rowY,
          { width: W - pad * 2 - 200 }
        );
    });
  }

  // ── Mint date ────────────────────────────────────────────────────────────────
  const mintDateY = histY + 18 + Math.max(duels.length, 1) * 22 + 10;
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(`rgb(${COLORS.muted.join(",")})`)
    .text(
      `Minted ${data.mintedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
      pad + 24,
      mintDateY
    );

  // ── QR Code ─────────────────────────────────────────────────────────────────
  try {
    const qrDataUrl = await QRCode.toDataURL(data.publicUrl, {
      width: 120,
      color: { dark: "#E8F4FF", light: "#111827" },
      errorCorrectionLevel: "M",
    });
    const qrBuffer = Buffer.from(qrDataUrl.split(",")[1], "base64");
    const qrX = W - pad - 24 - 110;
    const qrY = histY;
    doc.image(qrBuffer, qrX, qrY, { width: 110, height: 110 });
    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(`rgb(${COLORS.muted.join(",")})`)
      .text("Scan for weapon profile", qrX, qrY + 114, { width: 110, align: "center" });
  } catch {
    // QR generation optional — skip silently
  }

  // ── Bottom divider + tagline ─────────────────────────────────────────────────
  const bottomY = H - 80;
  doc
    .moveTo(pad + 24, bottomY)
    .lineTo(W - pad - 24, bottomY)
    .strokeColor(`rgb(${COLORS.voidPurple.join(",")})`)
    .lineWidth(0.5)
    .stroke();

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(`rgb(${COLORS.muted.join(",")})`)
    .text(
      "This weapon was forged, staked, and earned in the BattleForge arena.\nIts digital record is permanent. Its physical form is singular.",
      pad + 24,
      bottomY + 10,
      { align: "center", width: W - pad * 2 - 48 }
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(`rgb(${COLORS.arcCyan.join(",")})`)
    .text("battleforge.gg", pad + 24, bottomY + 38, {
      align: "center",
      width: W - pad * 2 - 48,
    });

  // ── Bottom gradient bar ──────────────────────────────────────────────────────
  const botGrad = doc.linearGradient(0, H - 8, W, H - 8);
  botGrad.stop(0, `rgb(${COLORS.voidPurple.join(",")})`);
  botGrad.stop(1, `rgb(${COLORS.arcCyan.join(",")})`);
  doc.rect(0, H - 8, W, 8).fill(botGrad);

  doc.end();
}
