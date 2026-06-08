// Client-side file generation for Brand Guideline exports.
// All three generators run entirely in the browser.

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import PptxGenJS from "pptxgenjs";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
} from "docx";

export interface BrandContent {
  brand_overview: any;
  voice_and_tone: any;
  visual_identity: any;
  target_audience: any;
  brand_positioning: any;
  digital_guidelines: any;
}

export interface BrandInputs {
  brandName: string;
  slogan?: string;
  industry: string;
  colorPalette?: any;
}

const hexToRgb = (hex: string): [number, number, number] => {
  const h = (hex || "#000000").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(v.slice(0, 2), 16) || 0,
    parseInt(v.slice(2, 4), 16) || 0,
    parseInt(v.slice(4, 6), 16) || 0,
  ];
};

// ── PDF ────────────────────────────────────────────────────────────
export async function generatePDF(content: BrandContent, inputs: BrandInputs): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const primaryColor: string = inputs.colorPalette?.primary?.hex || "#00C9A7";
  const W = doc.internal.pageSize.getWidth();
  const [pr, pg, pb] = hexToRgb(primaryColor);

  const addCover = () => {
    doc.setFillColor(13, 17, 23); doc.rect(0, 0, W, 297, "F");
    doc.setFillColor(pr, pg, pb); doc.rect(0, 0, 8, 297, "F");
    doc.setTextColor(255, 255, 255); doc.setFontSize(36); doc.setFont("helvetica", "bold");
    doc.text(inputs.brandName, 20, 80);
    if (inputs.slogan) {
      doc.setFontSize(16); doc.setFont("helvetica", "normal"); doc.setTextColor(180, 180, 180);
      doc.text(inputs.slogan, 20, 95);
    }
    doc.setFontSize(12); doc.setTextColor(pr, pg, pb);
    doc.text("BRAND GUIDELINES", 20, 115);
    doc.setTextColor(120, 120, 120); doc.setFontSize(10);
    doc.text(
      `Generated ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}`,
      20, 270,
    );
  };

  const addHeader = (title: string, y: number): number => {
    doc.setFillColor(pr, pg, pb); doc.rect(15, y, 4, 8, "F");
    doc.setTextColor(pr, pg, pb); doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), 22, y + 6);
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.2); doc.line(15, y + 11, W - 15, y + 11);
    return y + 18;
  };

  const addText = (text: string, x: number, y: number, maxW: number, size = 10): number => {
    doc.setFontSize(size); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
    const lines = doc.splitTextToSize(text ?? "", maxW);
    doc.text(lines, x, y);
    return y + lines.length * (size * 0.45);
  };

  const nextPage = (y: number): number => (y > 260 ? (doc.addPage(), 25) : y);

  addCover();
  doc.addPage();
  let y = 25;

  const bo = content.brand_overview ?? {};
  y = addHeader("Brand Overview", y);
  if (bo.mission_statement) y = addText(`Mission: ${bo.mission_statement}`, 15, y, W - 30) + 5;
  if (bo.vision_statement) y = addText(`Vision: ${bo.vision_statement}`, 15, y, W - 30) + 5;
  if (bo.brand_story) y = addText(bo.brand_story, 15, y, W - 30) + 8;

  if (Array.isArray(bo.core_values) && bo.core_values.length) {
    y = nextPage(y); y = addHeader("Core Values", y);
    for (const v of bo.core_values) {
      y = nextPage(y);
      doc.setFillColor(pr, pg, pb); doc.circle(19, y - 1, 1.5, "F");
      y = addText(String(v), 24, y, W - 40) + 2;
    }
    y += 5;
  }

  const vt = content.voice_and_tone ?? {};
  y = nextPage(y); y = addHeader("Voice & Tone", y);
  if (vt.personality_description) y = addText(`Tone: ${vt.personality_description}`, 15, y, W - 30) + 5;

  if (Array.isArray(vt.dos) && Array.isArray(vt.donts)) {
    const rows = vt.dos.map((d: string, i: number) => [d, vt.donts[i] ?? ""]);
    autoTable(doc, {
      startY: y,
      head: [["Do's", "Don'ts"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: 15, right: 15 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  if (Array.isArray(vt.sample_taglines) && vt.sample_taglines.length) {
    y = nextPage(y); y = addHeader("Sample Taglines", y);
    for (const t of vt.sample_taglines) {
      y = nextPage(y);
      doc.setFont("helvetica", "italic"); doc.setTextColor(pr, pg, pb); doc.setFontSize(10);
      doc.text(`"${t}"`, 20, y); y += 8;
    }
  }

  doc.addPage(); y = 25;
  const vi = content.visual_identity ?? {};
  const palette = vi.color_palette ?? {};
  y = addHeader("Visual Identity — Color Palette", y);
  let cx = 15;
  for (const color of Object.values(palette)) {
    const c = color as { hex?: string; name?: string };
    if (!c?.hex) continue;
    const [r, g, b] = hexToRgb(c.hex);
    doc.setFillColor(r, g, b); doc.roundedRect(cx, y, 28, 20, 2, 2, "F");
    doc.setTextColor(80, 80, 80); doc.setFontSize(8);
    doc.text(String(c.name ?? ""), cx, y + 26);
    doc.text(c.hex.toUpperCase(), cx, y + 31);
    cx += 34;
    if (cx > W - 30) { cx = 15; y += 38; }
  }
  y += 38;

  const typo = vi.typography ?? {};
  y = addHeader("Typography", y);
  if (typo.primary_font) y = addText(`Primary Font: ${typo.primary_font}`, 15, y, W - 30) + 4;
  if (typo.secondary_font) y = addText(`Secondary Font: ${typo.secondary_font}`, 15, y, W - 30) + 4;
  if (Array.isArray(typo.font_usage_rules)) {
    for (const r of typo.font_usage_rules) { y = nextPage(y); y = addText(`• ${r}`, 20, y, W - 40) + 2; }
  }
  y += 8;

  const persona = content.target_audience?.primary_persona ?? {};
  y = nextPage(y); y = addHeader("Target Audience", y);
  if (persona.name) y = addText(`Primary Persona: ${persona.name} (${persona.age_range ?? ""})`, 15, y, W - 30, 11) + 3;
  if (persona.description) y = addText(persona.description, 15, y, W - 30) + 5;

  doc.addPage(); y = 25;
  const bp = content.brand_positioning ?? {};
  y = addHeader("Brand Positioning", y);
  if (bp.positioning_statement) y = addText(bp.positioning_statement, 15, y, W - 30) + 5;
  if (Array.isArray(bp.competitive_differentiators)) {
    for (const d of bp.competitive_differentiators) { y = nextPage(y); y = addText(`• ${d}`, 20, y, W - 40) + 2; }
  }
  y += 8;

  const dg = content.digital_guidelines ?? {};
  const social = dg.social_media_guidelines ?? {};
  y = nextPage(y); y = addHeader("Digital Guidelines", y);
  if (social.profile_bio_template) y = addText(`Bio Template: ${social.profile_bio_template}`, 15, y, W - 30) + 5;
  if (Array.isArray(social.hashtag_strategy))
    y = addText(`Hashtags: ${social.hashtag_strategy.join("  ")}`, 15, y, W - 30) + 5;
  if (Array.isArray(social.content_pillars))
    y = addText(`Content Pillars: ${social.content_pillars.join(" · ")}`, 15, y, W - 30);

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
    doc.text(`${inputs.brandName} Brand Guidelines  ·  Page ${i} of ${pages}`, W / 2, 290, { align: "center" });
  }
  return doc.output("blob");
}

// ── PPTX ───────────────────────────────────────────────────────────
export async function generatePPTX(content: BrandContent, inputs: BrandInputs): Promise<Blob> {
  const pptx = new PptxGenJS();
  const primaryHex = (inputs.colorPalette?.primary?.hex || "#00C9A7").replace("#", "");
  const darkBg = "0D1117";

  pptx.defineLayout({ name: "LAYOUT_16x9", width: 10, height: 5.625 });
  pptx.layout = "LAYOUT_16x9";

  const title = () => {
    const s = pptx.addSlide();
    s.background = { color: darkBg };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: 5.625, fill: { color: primaryHex } });
    s.addText(inputs.brandName, { x: 0.3, y: 1.5, w: 9, h: 1, fontSize: 40, bold: true, color: "FFFFFF", fontFace: "Calibri" });
    if (inputs.slogan) s.addText(inputs.slogan, { x: 0.3, y: 2.6, w: 9, h: 0.5, fontSize: 18, color: "AAAAAA", fontFace: "Calibri" });
    s.addText("BRAND GUIDELINES", { x: 0.3, y: 3.2, w: 5, h: 0.4, fontSize: 12, color: primaryHex, bold: true, fontFace: "Calibri" });
    s.addText(String(new Date().getFullYear()), { x: 0.3, y: 5.1, w: 3, h: 0.3, fontSize: 9, color: "666666" });
  };

  const slide = (heading: string, bullets: string[]) => {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.8, fill: { color: darkBg } });
    s.addText(heading.toUpperCase(), { x: 0.3, y: 0.15, w: 9, h: 0.5, fontSize: 14, bold: true, color: primaryHex, fontFace: "Calibri" });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0.8, w: 0.06, h: 4.825, fill: { color: primaryHex } });
    const items = bullets.filter(Boolean).map((b) => ({
      text: b,
      options: { bullet: { type: "bullet" as const }, fontSize: 13, color: "333333", paraSpaceAfter: 6 },
    }));
    s.addText(items, { x: 0.25, y: 1.0, w: 9.5, h: 4.4, valign: "top", fontFace: "Calibri" });
  };

  const twoCol = (h: string, lt: string, l: string[], rt: string, r: string[]) => {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.8, fill: { color: darkBg } });
    s.addText(h.toUpperCase(), { x: 0.3, y: 0.15, w: 9, h: 0.5, fontSize: 14, bold: true, color: primaryHex, fontFace: "Calibri" });
    s.addText(lt, { x: 0.3, y: 1.0, w: 4.5, h: 0.4, fontSize: 12, bold: true, color: "111111" });
    s.addText(l.map((i) => ({ text: i, options: { bullet: true as const, fontSize: 11, color: "444444", paraSpaceAfter: 4 } })),
      { x: 0.3, y: 1.4, w: 4.5, h: 3.8, valign: "top" });
    s.addText(rt, { x: 5.2, y: 1.0, w: 4.5, h: 0.4, fontSize: 12, bold: true, color: "111111" });
    s.addText(r.map((i) => ({ text: i, options: { bullet: true as const, fontSize: 11, color: "444444", paraSpaceAfter: 4 } })),
      { x: 5.2, y: 1.4, w: 4.5, h: 3.8, valign: "top" });
  };

  const bo = content.brand_overview ?? {};
  const vt = content.voice_and_tone ?? {};
  const vi = content.visual_identity ?? {};
  const ta = content.target_audience?.primary_persona ?? {};
  const bp = content.brand_positioning ?? {};
  const dg = content.digital_guidelines ?? {};
  const social = dg.social_media_guidelines ?? {};

  title();
  slide("Brand Overview", [
    bo.mission_statement && `Mission: ${bo.mission_statement}`,
    bo.vision_statement && `Vision: ${bo.vision_statement}`,
    bo.unique_value_proposition && `UVP: ${bo.unique_value_proposition}`,
  ].filter(Boolean) as string[]);
  if (Array.isArray(bo.core_values)) slide("Core Values", bo.core_values);
  if (Array.isArray(vt.dos) && Array.isArray(vt.donts)) twoCol("Voice & Tone", "Do's", vt.dos, "Don'ts", vt.donts);
  if (Array.isArray(vt.sample_taglines))
    slide("Sample Taglines", vt.sample_taglines.map((t: string) => `"${t}"`));

  const palette = vi.color_palette ?? {};
  const ps = pptx.addSlide();
  ps.background = { color: "FFFFFF" };
  ps.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 10, h: 0.8, fill: { color: darkBg } });
  ps.addText("COLOR PALETTE", { x: 0.3, y: 0.15, w: 9, h: 0.5, fontSize: 14, bold: true, color: primaryHex });
  let cx = 0.3;
  for (const v of Object.values(palette)) {
    const c = v as { hex?: string; name?: string };
    if (!c?.hex) continue;
    ps.addShape(pptx.ShapeType.roundRect, { x: cx, y: 1.0, w: 1.7, h: 1.4, fill: { color: c.hex.replace("#", "") }, rectRadius: 0.05 });
    ps.addText(String(c.name ?? ""), { x: cx, y: 2.5, w: 1.7, h: 0.3, fontSize: 9, align: "center", color: "333333" });
    ps.addText(c.hex.toUpperCase(), { x: cx, y: 2.8, w: 1.7, h: 0.25, fontSize: 8, align: "center", color: "888888" });
    cx += 1.9;
  }

  const typo = vi.typography ?? {};
  slide("Typography", [
    typo.primary_font && `Primary Font: ${typo.primary_font}`,
    typo.secondary_font && `Secondary Font: ${typo.secondary_font}`,
    typo.heading_style && `Heading Style: ${typo.heading_style}`,
    typo.body_style && `Body Style: ${typo.body_style}`,
    ...(Array.isArray(typo.font_usage_rules) ? typo.font_usage_rules : []),
  ].filter(Boolean) as string[]);

  slide("Target Audience", [
    ta.name && `Primary Persona: ${ta.name} (${ta.age_range ?? ""})`,
    ta.description,
    Array.isArray(ta.pain_points) && `Pain Points: ${ta.pain_points.join(", ")}`,
    Array.isArray(ta.goals) && `Goals: ${ta.goals.join(", ")}`,
    Array.isArray(ta.preferred_channels) && `Channels: ${ta.preferred_channels.join(", ")}`,
  ].filter(Boolean) as string[]);

  slide("Brand Positioning", [
    bp.positioning_statement,
    ...(Array.isArray(bp.competitive_differentiators) ? bp.competitive_differentiators : []),
  ].filter(Boolean) as string[]);

  slide("Digital Guidelines", [
    social.profile_bio_template && `Bio Template: ${social.profile_bio_template}`,
    Array.isArray(social.hashtag_strategy) && `Hashtags: ${social.hashtag_strategy.join("  ")}`,
    social.posting_tone && `Posting Tone: ${social.posting_tone}`,
    Array.isArray(social.content_pillars) && `Content Pillars: ${social.content_pillars.join(" · ")}`,
  ].filter(Boolean) as string[]);

  const end = pptx.addSlide();
  end.background = { color: darkBg };
  end.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.08, h: 5.625, fill: { color: primaryHex } });
  end.addText("Thank You", { x: 1, y: 1.8, w: 8, h: 1, fontSize: 36, bold: true, color: "FFFFFF", align: "center" });
  end.addText(`${inputs.brandName} Brand Guidelines`, { x: 1, y: 2.9, w: 8, h: 0.5, fontSize: 14, color: primaryHex, align: "center" });

  const buf = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}

// ── DOCX ───────────────────────────────────────────────────────────
export async function generateDOCX(content: BrandContent, inputs: BrandInputs): Promise<Blob> {
  const primaryColor = (inputs.colorPalette?.primary?.hex || "#00C9A7").replace("#", "");

  const h1 = (t: string) =>
    new Paragraph({
      text: t,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 100 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: primaryColor, space: 1 } },
    });
  const h2 = (t: string) =>
    new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 300, after: 100 } });
  const body = (t: string) =>
    new Paragraph({ children: [new TextRun({ text: t, size: 22, color: "333333" })], spacing: { after: 100 } });
  const bullet = (t: string) =>
    new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 60 } });

  const bo = content.brand_overview ?? {};
  const vt = content.voice_and_tone ?? {};
  const vi = content.visual_identity ?? {};
  const ta = content.target_audience?.primary_persona ?? {};
  const bp = content.brand_positioning ?? {};
  const dg = content.digital_guidelines ?? {};

  const children: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: inputs.brandName, bold: true, size: 56, color: primaryColor, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 800, after: 200 },
    }),
    inputs.slogan
      ? new Paragraph({
          children: [new TextRun({ text: inputs.slogan, size: 28, color: "888888", italics: true, font: "Calibri" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        })
      : new Paragraph({ text: "" }),
    new Paragraph({
      children: [new TextRun({ text: "BRAND GUIDELINES", bold: true, size: 20, color: "AAAAAA", font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),
    new Paragraph({ text: "", pageBreakBefore: true }),

    h1("Brand Overview"),
    ...(bo.mission_statement ? [h2("Mission Statement"), body(bo.mission_statement)] : []),
    ...(bo.vision_statement ? [h2("Vision Statement"), body(bo.vision_statement)] : []),
    ...(bo.brand_story ? [h2("Brand Story"), body(bo.brand_story)] : []),
    ...(Array.isArray(bo.core_values) ? [h2("Core Values"), ...bo.core_values.map((v: string) => bullet(v))] : []),
    ...(bo.unique_value_proposition ? [h2("Unique Value Proposition"), body(bo.unique_value_proposition)] : []),

    new Paragraph({ text: "", pageBreakBefore: true }),
    h1("Voice & Tone"),
    ...(vt.personality_description ? [h2("Personality"), body(vt.personality_description)] : []),
    ...(Array.isArray(vt.dos) ? [h2("Communication Do's"), ...vt.dos.map((v: string) => bullet(v))] : []),
    ...(Array.isArray(vt.donts) ? [h2("Communication Don'ts"), ...vt.donts.map((v: string) => bullet(v))] : []),
    ...(Array.isArray(vt.sample_taglines)
      ? [
          h2("Sample Taglines"),
          ...vt.sample_taglines.map(
            (t: string) =>
              new Paragraph({
                children: [new TextRun({ text: `"${t}"`, italics: true, color: primaryColor, size: 22 })],
                spacing: { after: 80 },
              }),
          ),
        ]
      : []),
    ...(Array.isArray(vt.sample_headlines) ? [h2("Sample Headlines"), ...vt.sample_headlines.map((v: string) => bullet(v))] : []),
    ...(Array.isArray(vt.sample_social_posts) ? [h2("Sample Social Posts"), ...vt.sample_social_posts.map((v: string) => bullet(v))] : []),

    new Paragraph({ text: "", pageBreakBefore: true }),
    h1("Visual Identity"),
    h2("Color Palette"),
    ...Object.values(vi.color_palette ?? {}).map((c: any) =>
      body(`${c?.name ?? ""} (${(c?.hex ?? "").toUpperCase()}) — ${c?.usage ?? ""}`),
    ),
    ...(vi.typography
      ? [
          h2("Typography"),
          body(`Primary Font: ${vi.typography.primary_font ?? ""}`),
          body(`Secondary Font: ${vi.typography.secondary_font ?? ""}`),
          ...(Array.isArray(vi.typography.font_usage_rules)
            ? vi.typography.font_usage_rules.map((v: string) => bullet(v))
            : []),
        ]
      : []),
    ...(vi.logo_usage
      ? [
          h2("Logo Usage Rules"),
          body(`Clear Space: ${vi.logo_usage.clear_space_rule ?? ""}`),
          body(`Minimum Size: ${vi.logo_usage.minimum_size ?? ""}`),
          ...(Array.isArray(vi.logo_usage.forbidden_uses)
            ? [h2("Forbidden Logo Uses"), ...vi.logo_usage.forbidden_uses.map((v: string) => bullet(v))]
            : []),
        ]
      : []),

    new Paragraph({ text: "", pageBreakBefore: true }),
    h1("Target Audience"),
    ...(ta.name ? [h2(`Primary Persona: ${ta.name}`), body(`Age Range: ${ta.age_range ?? ""}`)] : []),
    ...(ta.description ? [body(ta.description)] : []),
    ...(Array.isArray(ta.pain_points) ? [h2("Pain Points"), ...ta.pain_points.map((v: string) => bullet(v))] : []),
    ...(Array.isArray(ta.goals) ? [h2("Goals"), ...ta.goals.map((v: string) => bullet(v))] : []),
    ...(Array.isArray(ta.preferred_channels) ? [h2("Preferred Channels"), ...ta.preferred_channels.map((v: string) => bullet(v))] : []),

    new Paragraph({ text: "", pageBreakBefore: true }),
    h1("Brand Positioning"),
    ...(bp.positioning_statement ? [body(bp.positioning_statement)] : []),
    ...(Array.isArray(bp.competitive_differentiators)
      ? [h2("Competitive Differentiators"), ...bp.competitive_differentiators.map((v: string) => bullet(v))]
      : []),

    new Paragraph({ text: "", pageBreakBefore: true }),
    h1("Digital Guidelines"),
    ...(dg.social_media_guidelines
      ? [
          h2("Social Media"),
          body(`Bio Template: ${dg.social_media_guidelines.profile_bio_template ?? ""}`),
          body(`Posting Tone: ${dg.social_media_guidelines.posting_tone ?? ""}`),
          ...(Array.isArray(dg.social_media_guidelines.hashtag_strategy)
            ? [h2("Hashtag Strategy"), ...dg.social_media_guidelines.hashtag_strategy.map((v: string) => bullet(v))]
            : []),
          ...(Array.isArray(dg.social_media_guidelines.content_pillars)
            ? [h2("Content Pillars"), ...dg.social_media_guidelines.content_pillars.map((v: string) => bullet(v))]
            : []),
        ]
      : []),
    ...(dg.email_guidelines
      ? [
          h2("Email Guidelines"),
          body(`Subject Line Style: ${dg.email_guidelines.subject_line_style ?? ""}`),
          body(`Greeting Style: ${dg.email_guidelines.greeting_style ?? ""}`),
          body(`Signature Template: ${dg.email_guidelines.signature_template ?? ""}`),
        ]
      : []),
  ];

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
