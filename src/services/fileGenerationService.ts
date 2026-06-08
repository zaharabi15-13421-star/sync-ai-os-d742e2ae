// Client-side Brand Guideline document generators (PDF / PPTX / DOCX).
// Agency-grade output: cover, table of contents, deep sections.

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
  Table,
  TableRow,
  TableCell,
  WidthType,
  PageBreak,
} from "docx";

export interface BrandContent {
  brand_overview?: any;
  voice_and_tone?: any;
  visual_identity?: any;
  target_audience?: any;
  brand_positioning?: any;
  brand_applications?: any;
  brand_dos_donts?: any;
  accessibility?: any;
  digital_guidelines?: any;
  implementation_roadmap?: any;
}

export interface BrandInputs {
  brandName: string;
  slogan?: string;
  industry: string;
  colorPalette?: any;
}

/* ── color utils ─────────────────────────────────────────── */
const hexToRgb = (hex: string): [number, number, number] => {
  const h = (hex || "#000000").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [
    parseInt(v.slice(0, 2), 16) || 0,
    parseInt(v.slice(2, 4), 16) || 0,
    parseInt(v.slice(4, 6), 16) || 0,
  ];
};
const rgbToCmyk = (r: number, g: number, b: number) => {
  const rr = r / 255, gg = g / 255, bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
  return {
    c: Math.round(((1 - rr - k) / (1 - k)) * 100),
    m: Math.round(((1 - gg - k) / (1 - k)) * 100),
    y: Math.round(((1 - bb - k) / (1 - k)) * 100),
    k: Math.round(k * 100),
  };
};
const ensureColorMeta = (c: any) => {
  if (!c || !c.hex) return null;
  const [r, g, b] = hexToRgb(c.hex);
  const rgb = c.rgb ?? { r, g, b };
  const cmyk = c.cmyk ?? rgbToCmyk(r, g, b);
  return { ...c, rgb, cmyk };
};
const arr = <T,>(x: any): T[] => (Array.isArray(x) ? x : []);
const str = (x: any): string => (typeof x === "string" ? x : "");

/* ════════════════════════════════════════════════════════════
   PDF
   ════════════════════════════════════════════════════════════ */
export async function generatePDF(content: BrandContent, inputs: BrandInputs): Promise<Blob> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;

  const primaryHex: string =
    content.visual_identity?.color_palette?.primary?.hex ||
    inputs.colorPalette?.primary?.hex ||
    "#0EA5A4";
  const [pr, pg, pb] = hexToRgb(primaryHex);

  let pageNum = 0;
  const sections: { title: string; page: number }[] = [];

  /* primitives */
  const setBody = () => { doc.setFont("helvetica", "normal"); doc.setFontSize(10.5); doc.setTextColor(45, 45, 50); };
  const ensureSpace = (y: number, needed = 12) => (y > H - M - needed ? newPage() : y);
  const newPage = () => {
    doc.addPage();
    pageNum++;
    drawPageChrome();
    return M + 14;
  };
  const drawPageChrome = () => {
    doc.setDrawColor(230); doc.setLineWidth(0.2);
    doc.line(M, H - M, W - M, H - M);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`${inputs.brandName} · Brand Guidelines`, M, H - M + 5);
    doc.text(`${pageNum}`, W - M, H - M + 5, { align: "right" });
    setBody();
  };

  const sectionHeading = (title: string, y: number) => {
    y = ensureSpace(y, 24);
    sections.push({ title, page: pageNum });
    doc.setFillColor(pr, pg, pb); doc.rect(M, y, 3, 9, "F");
    doc.setTextColor(20, 20, 30); doc.setFont("helvetica", "bold"); doc.setFontSize(18);
    doc.text(title, M + 6, y + 7);
    doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.4);
    doc.line(M, y + 13, W - M, y + 13);
    setBody();
    return y + 20;
  };
  const subHeading = (t: string, y: number) => {
    y = ensureSpace(y, 14);
    doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(pr, pg, pb);
    doc.text(t.toUpperCase(), M, y);
    setBody();
    return y + 6;
  };
  const para = (text: string, y: number, opts: { italic?: boolean; size?: number } = {}) => {
    if (!text) return y;
    doc.setFont("helvetica", opts.italic ? "italic" : "normal");
    doc.setFontSize(opts.size ?? 10.5);
    doc.setTextColor(55, 55, 60);
    const lines = doc.splitTextToSize(text, W - M * 2);
    for (const line of lines) {
      y = ensureSpace(y, 6);
      doc.text(line, M, y);
      y += (opts.size ?? 10.5) * 0.45;
    }
    setBody();
    return y + 2;
  };
  const bullet = (text: string, y: number) => {
    y = ensureSpace(y, 8);
    doc.setFillColor(pr, pg, pb); doc.circle(M + 1.5, y - 1.3, 0.9, "F");
    const lines = doc.splitTextToSize(text, W - M * 2 - 6);
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) y = ensureSpace(y, 6);
      doc.text(lines[i], M + 5, y);
      y += 5;
    }
    return y + 1;
  };
  const keyVal = (k: string, v: string, y: number) => {
    if (!v) return y;
    y = ensureSpace(y, 7);
    doc.setFont("helvetica", "bold"); doc.setTextColor(30, 30, 35);
    doc.text(`${k}:`, M, y);
    const kw = doc.getTextWidth(`${k}: `);
    doc.setFont("helvetica", "normal"); doc.setTextColor(55);
    const lines = doc.splitTextToSize(v, W - M * 2 - kw);
    doc.text(lines[0] ?? "", M + kw, y);
    y += 5;
    for (let i = 1; i < lines.length; i++) {
      y = ensureSpace(y, 5);
      doc.text(lines[i], M + kw, y); y += 5;
    }
    return y + 2;
  };

  /* COVER */
  pageNum = 1;
  doc.setFillColor(13, 17, 23); doc.rect(0, 0, W, H, "F");
  doc.setFillColor(pr, pg, pb); doc.rect(0, 0, 6, H, "F");
  doc.setTextColor(pr, pg, pb); doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("BRAND GUIDELINES", M, 50);
  doc.setTextColor(255); doc.setFontSize(48); doc.setFont("helvetica", "bold");
  const nameLines = doc.splitTextToSize(inputs.brandName, W - M * 2);
  doc.text(nameLines, M, 85);
  if (inputs.slogan) {
    doc.setFontSize(15); doc.setFont("helvetica", "italic"); doc.setTextColor(200);
    doc.text(doc.splitTextToSize(inputs.slogan, W - M * 2), M, 110);
  }
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(130);
  doc.text("A complete brand identity, voice, and application system.", M, H - 60);
  doc.text(
    `Prepared ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}`,
    M, H - 50,
  );
  doc.text("Confidential — for internal brand stakeholders", M, H - 42);

  /* placeholder TOC page — fill at the end */
  doc.addPage(); pageNum++;
  const tocPageIndex = doc.getNumberOfPages();

  /* CONTENT */
  let y = newPage();

  const bo = content.brand_overview ?? {};
  y = sectionHeading("01 · Brand Overview", y);
  if (bo.elevator_pitch) y = para(bo.elevator_pitch, y, { italic: true });
  if (bo.brand_story) { y = subHeading("Brand Story", y); y = para(bo.brand_story, y); }
  if (bo.mission_statement) { y = subHeading("Mission", y); y = para(bo.mission_statement, y); }
  if (bo.vision_statement) { y = subHeading("Vision", y); y = para(bo.vision_statement, y); }
  if (bo.brand_promise) { y = subHeading("Brand Promise", y); y = para(bo.brand_promise, y); }
  if (bo.unique_value_proposition) { y = subHeading("Unique Value Proposition", y); y = para(bo.unique_value_proposition, y); }
  const cv = arr<any>(bo.core_values);
  if (cv.length) {
    y = subHeading("Core Values", y);
    for (const v of cv) {
      const name = typeof v === "string" ? v : v?.name;
      const desc = typeof v === "string" ? "" : v?.description ?? "";
      y = bullet(desc ? `${name} — ${desc}` : String(name ?? ""), y);
    }
  }
  const pillars = arr<any>(bo.brand_pillars);
  if (pillars.length) {
    y = subHeading("Brand Pillars", y);
    for (const p of pillars) y = bullet(`${p.name ?? ""} — ${p.description ?? ""}`, y);
  }

  /* Positioning */
  const bp = content.brand_positioning ?? {};
  y = sectionHeading("02 · Brand Positioning", newPage());
  if (bp.positioning_statement) { y = subHeading("Positioning Statement", y); y = para(bp.positioning_statement, y, { italic: true }); }
  if (bp.category_definition) { y = subHeading("Category", y); y = para(bp.category_definition, y); }
  if (bp.market_category) y = keyVal("Market Category", bp.market_category, y);
  if (bp.competitive_landscape_notes) { y = subHeading("Competitive Landscape", y); y = para(bp.competitive_landscape_notes, y); }
  const diffs = arr<string>(bp.competitive_differentiators);
  if (diffs.length) { y = subHeading("Competitive Differentiators", y); for (const d of diffs) y = bullet(d, y); }
  const competitors = arr<any>(bp.competitor_snapshot);
  if (competitors.length) {
    y = subHeading("Competitor Snapshot", y);
    autoTable(doc, {
      startY: y,
      head: [["Competitor", "Positioning", "How we differ"]],
      body: competitors.map((c) => [c.name ?? "", c.positioning ?? "", c.how_we_differ ?? ""]),
      theme: "grid",
      headStyles: { fillColor: [pr, pg, pb], textColor: 255, fontStyle: "bold" },
      styles: { fontSize: 9, cellPadding: 3, textColor: 50 },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  const pillarsM = arr<any>(bp.messaging_pillars);
  if (pillarsM.length) {
    y = subHeading("Messaging Pillars", y);
    for (const p of pillarsM) {
      y = bullet(`${p.pillar ?? ""}`, y);
      for (const pf of arr<string>(p.proof_points)) y = bullet(`   · ${pf}`, y);
    }
  }

  /* Audience */
  const ta = content.target_audience ?? {};
  const pp = ta.primary_persona ?? {};
  const sp = ta.secondary_persona ?? {};
  y = sectionHeading("03 · Target Audience", newPage());
  if (pp.name) {
    y = subHeading(`Primary Persona — ${pp.name}`, y);
    if (pp.age_range) y = keyVal("Age", pp.age_range, y);
    if (pp.occupation) y = keyVal("Occupation", pp.occupation, y);
    if (pp.description) y = para(pp.description, y);
    if (arr(pp.pain_points).length) { y = subHeading("Pain Points", y); for (const x of arr<string>(pp.pain_points)) y = bullet(x, y); }
    if (arr(pp.goals).length) { y = subHeading("Goals", y); for (const x of arr<string>(pp.goals)) y = bullet(x, y); }
    if (arr(pp.motivations).length) { y = subHeading("Motivations", y); for (const x of arr<string>(pp.motivations)) y = bullet(x, y); }
    if (arr(pp.preferred_channels).length) y = keyVal("Channels", arr<string>(pp.preferred_channels).join(", "), y);
    if (pp.buying_behavior) y = keyVal("Buying Behavior", pp.buying_behavior, y);
  }
  if (sp.name) {
    y = subHeading(`Secondary Persona — ${sp.name}`, y);
    if (sp.age_range) y = keyVal("Age", sp.age_range, y);
    if (sp.description) y = para(sp.description, y);
  }

  /* Voice & Tone */
  const vt = content.voice_and_tone ?? {};
  y = sectionHeading("04 · Brand Voice & Tone", newPage());
  if (vt.primary_tone) y = keyVal("Primary Tone", vt.primary_tone, y);
  if (vt.secondary_tone) y = keyVal("Secondary Tone", vt.secondary_tone, y);
  if (vt.communication_style) { y = subHeading("Communication Style", y); y = para(vt.communication_style, y); }
  if (vt.personality_description) { y = subHeading("Brand Personality", y); y = para(vt.personality_description, y); }
  const traits = arr<any>(vt.personality_traits);
  if (traits.length) {
    y = subHeading("Personality Traits", y);
    for (const t of traits) y = bullet(`${t.trait ?? ""} — ${t.description ?? ""}`, y);
  }
  if (arr(vt.lexicon_we_use).length || arr(vt.lexicon_we_avoid).length) {
    y = subHeading("Lexicon", y);
    const max = Math.max(arr(vt.lexicon_we_use).length, arr(vt.lexicon_we_avoid).length);
    const rows: string[][] = [];
    for (let i = 0; i < max; i++) rows.push([arr<string>(vt.lexicon_we_use)[i] ?? "", arr<string>(vt.lexicon_we_avoid)[i] ?? ""]);
    autoTable(doc, {
      startY: y,
      head: [["Words we use", "Words we avoid"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  if (arr(vt.dos).length || arr(vt.donts).length) {
    y = subHeading("Do's and Don'ts", y);
    const max = Math.max(arr(vt.dos).length, arr(vt.donts).length);
    const rows: string[][] = [];
    for (let i = 0; i < max; i++) rows.push([arr<string>(vt.dos)[i] ?? "", arr<string>(vt.donts)[i] ?? ""]);
    autoTable(doc, {
      startY: y,
      head: [["Do", "Don't"]],
      body: rows,
      theme: "grid",
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  if (arr(vt.sample_taglines).length) {
    y = subHeading("Sample Taglines", y);
    for (const t of arr<string>(vt.sample_taglines)) y = para(`“${t}”`, y, { italic: true });
  }
  if (arr(vt.sample_headlines).length) {
    y = subHeading("Sample Headlines", y);
    for (const t of arr<string>(vt.sample_headlines)) y = bullet(t, y);
  }
  if (arr(vt.sample_social_posts).length) {
    y = subHeading("Sample Social Posts", y);
    for (const t of arr<string>(vt.sample_social_posts)) y = bullet(t, y);
  }
  if (vt.sample_email_intro) { y = subHeading("Sample Email Intro", y); y = para(vt.sample_email_intro, y, { italic: true }); }
  if (vt.sample_about_paragraph) { y = subHeading("Sample About Paragraph", y); y = para(vt.sample_about_paragraph, y); }

  /* Visual Identity — Color */
  const vi = content.visual_identity ?? {};
  const palette = vi.color_palette ?? {};
  y = sectionHeading("05 · Color System", newPage());
  const palOrder = ["primary", "secondary", "accent", "background", "text"];
  const paletteRows: string[][] = [];
  for (const key of palOrder) {
    const c = ensureColorMeta(palette[key]);
    if (!c) continue;
    paletteRows.push([
      key.toUpperCase(),
      String(c.name ?? ""),
      String(c.hex ?? "").toUpperCase(),
      `R${c.rgb.r} G${c.rgb.g} B${c.rgb.b}`,
      `C${c.cmyk.c} M${c.cmyk.m} Y${c.cmyk.y} K${c.cmyk.k}`,
      String(c.pantone_suggestion ?? "—"),
    ]);
  }
  // visual swatches
  let cx = M; let cy = y;
  for (const key of palOrder) {
    const c = ensureColorMeta(palette[key]); if (!c) continue;
    const [r, g, b] = hexToRgb(c.hex);
    doc.setFillColor(r, g, b); doc.roundedRect(cx, cy, 30, 22, 2, 2, "F");
    doc.setFontSize(8); doc.setTextColor(80);
    doc.text(String(c.name ?? key).slice(0, 18), cx, cy + 27);
    doc.text(String(c.hex).toUpperCase(), cx, cy + 31);
    cx += 34; if (cx > W - M - 30) { cx = M; cy += 38; }
  }
  y = cy + 40;
  if (paletteRows.length) {
    autoTable(doc, {
      startY: y,
      head: [["Role", "Name", "HEX", "RGB", "CMYK", "Pantone"]],
      body: paletteRows,
      theme: "grid",
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  for (const key of palOrder) {
    const c = palette[key]; if (!c?.hex) continue;
    if (c.usage || c.psychology) {
      y = subHeading(`${(c.name ?? key).toString()} · ${String(c.hex).toUpperCase()}`, y);
      if (c.usage) y = keyVal("Usage", c.usage, y);
      if (c.psychology) y = keyVal("Psychology", c.psychology, y);
    }
  }
  const neutrals = arr<any>(vi.neutral_palette);
  if (neutrals.length) {
    y = subHeading("Neutral Palette", y);
    autoTable(doc, {
      startY: y,
      head: [["Name", "HEX", "Usage"]],
      body: neutrals.map((n) => [n.name ?? "", String(n.hex ?? "").toUpperCase(), n.usage ?? ""]),
      theme: "grid",
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 2.5 },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  if (arr(vi.color_usage_rules).length) {
    y = subHeading("Color Usage Rules", y);
    for (const r of arr<string>(vi.color_usage_rules)) y = bullet(r, y);
  }
  if (arr(vi.color_combinations_recommended).length) {
    y = subHeading("Recommended Combinations", y);
    for (const r of arr<string>(vi.color_combinations_recommended)) y = bullet(r, y);
  }
  if (arr(vi.color_combinations_avoid).length) {
    y = subHeading("Combinations to Avoid", y);
    for (const r of arr<string>(vi.color_combinations_avoid)) y = bullet(r, y);
  }

  /* Typography */
  const typo = vi.typography ?? {};
  y = sectionHeading("06 · Typography", newPage());
  if (typo.primary_font) y = keyVal("Primary Typeface", typo.primary_font, y);
  if (typo.primary_font_rationale) y = para(typo.primary_font_rationale, y);
  if (typo.secondary_font) y = keyVal("Secondary Typeface", typo.secondary_font, y);
  if (typo.secondary_font_rationale) y = para(typo.secondary_font_rationale, y);
  if (typo.heading_style) y = keyVal("Heading Style", typo.heading_style, y);
  if (typo.body_style) y = keyVal("Body Style", typo.body_style, y);
  const scale = arr<any>(typo.type_scale);
  if (scale.length) {
    y = subHeading("Type Scale", y);
    autoTable(doc, {
      startY: y,
      head: [["Level", "Font", "Weight", "Size", "Line height", "Letter spacing", "Usage"]],
      body: scale.map((s) => [
        s.level ?? "", s.font ?? "", s.weight ?? "",
        `${s.size_px ?? ""}${s.size_pt ? ` / ${s.size_pt}` : ""}`,
        s.line_height ?? "", s.letter_spacing ?? "", s.usage ?? "",
      ]),
      theme: "grid",
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }
  if (arr(typo.font_usage_rules).length) {
    y = subHeading("Usage Rules", y);
    for (const r of arr<string>(typo.font_usage_rules)) y = bullet(r, y);
  }
  if (arr(typo.font_pairings).length) {
    y = subHeading("Font Pairings", y);
    for (const r of arr<string>(typo.font_pairings)) y = bullet(r, y);
  }

  /* Logo */
  const lg = vi.logo_usage ?? {};
  y = sectionHeading("07 · Logo Usage", newPage());
  if (lg.construction_notes) { y = subHeading("Construction", y); y = para(lg.construction_notes, y); }
  if (lg.clear_space_rule) y = keyVal("Clear Space", lg.clear_space_rule, y);
  if (lg.minimum_size_digital) y = keyVal("Minimum Size (Digital)", lg.minimum_size_digital, y);
  if (lg.minimum_size_print) y = keyVal("Minimum Size (Print)", lg.minimum_size_print, y);
  if (arr(lg.approved_backgrounds).length) { y = subHeading("Approved Backgrounds", y); for (const r of arr<string>(lg.approved_backgrounds)) y = bullet(r, y); }
  const variations = arr<any>(lg.logo_variations);
  if (variations.length) {
    y = subHeading("Variations", y);
    for (const v of variations) y = bullet(`${v.name ?? ""} — ${v.when_to_use ?? ""}`, y);
  }
  if (arr(lg.forbidden_uses).length) {
    y = subHeading("Don't", y);
    for (const r of arr<string>(lg.forbidden_uses)) y = bullet(r, y);
  }
  if (lg.co_branding_rules) { y = subHeading("Co-Branding", y); y = para(lg.co_branding_rules, y); }

  /* Imagery */
  const im = vi.imagery_style ?? {};
  if (Object.keys(im).length) {
    y = sectionHeading("08 · Imagery & Visual Style", newPage());
    if (im.photography_direction) { y = subHeading("Photography Direction", y); y = para(im.photography_direction, y); }
    if (im.illustration_style) { y = subHeading("Illustration Style", y); y = para(im.illustration_style, y); }
    if (im.iconography_style) { y = subHeading("Iconography", y); y = para(im.iconography_style, y); }
    if (arr(im.composition_principles).length) { y = subHeading("Composition Principles", y); for (const r of arr<string>(im.composition_principles)) y = bullet(r, y); }
    if (im.color_treatment) y = keyVal("Color Treatment", im.color_treatment, y);
    if (arr(im.mood_keywords).length) y = keyVal("Mood Keywords", arr<string>(im.mood_keywords).join(" · "), y);
    if (arr(im.dos).length || arr(im.donts).length) {
      const max = Math.max(arr(im.dos).length, arr(im.donts).length);
      const rows: string[][] = [];
      for (let i = 0; i < max; i++) rows.push([arr<string>(im.dos)[i] ?? "", arr<string>(im.donts)[i] ?? ""]);
      autoTable(doc, {
        startY: y, head: [["Do", "Don't"]], body: rows, theme: "grid",
        headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 3 }, margin: { left: M, right: M },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }
  }

  /* Applications */
  const ap = content.brand_applications ?? {};
  if (Object.values(ap).some((v) => arr(v).length)) {
    y = sectionHeading("09 · Brand Applications", newPage());
    const groups: [string, string][] = [
      ["Digital", "digital"], ["Print", "print"], ["Social Media", "social_media"],
      ["Merchandise", "merchandise"], ["Environmental", "environmental"], ["Packaging", "packaging"],
    ];
    for (const [label, key] of groups) {
      const items = arr<string>(ap[key]);
      if (!items.length) continue;
      y = subHeading(label, y);
      for (const it of items) y = bullet(it, y);
    }
  }

  /* Do's & Don'ts overall */
  const dd = content.brand_dos_donts ?? {};
  if (arr(dd.overall_dos).length || arr(dd.overall_donts).length) {
    y = sectionHeading("10 · Brand Do's and Don'ts", newPage());
    const max = Math.max(arr(dd.overall_dos).length, arr(dd.overall_donts).length);
    const rows: string[][] = [];
    for (let i = 0; i < max; i++) rows.push([arr<string>(dd.overall_dos)[i] ?? "", arr<string>(dd.overall_donts)[i] ?? ""]);
    autoTable(doc, {
      startY: y, head: [["Do", "Don't"]], body: rows, theme: "grid",
      headStyles: { fillColor: [pr, pg, pb], textColor: 255 },
      styles: { fontSize: 9.5, cellPadding: 3 }, margin: { left: M, right: M },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  /* Accessibility */
  const ac = content.accessibility ?? {};
  if (Object.values(ac).some((v) => arr(v).length)) {
    y = sectionHeading("11 · Accessibility", newPage());
    if (arr(ac.contrast_principles).length) { y = subHeading("Contrast", y); for (const r of arr<string>(ac.contrast_principles)) y = bullet(r, y); }
    if (arr(ac.color_blind_considerations).length) { y = subHeading("Color Blindness", y); for (const r of arr<string>(ac.color_blind_considerations)) y = bullet(r, y); }
    if (arr(ac.type_legibility_rules).length) { y = subHeading("Type Legibility", y); for (const r of arr<string>(ac.type_legibility_rules)) y = bullet(r, y); }
    if (arr(ac.inclusive_language_rules).length) { y = subHeading("Inclusive Language", y); for (const r of arr<string>(ac.inclusive_language_rules)) y = bullet(r, y); }
  }

  /* Digital Guidelines */
  const dg = content.digital_guidelines ?? {};
  const social = dg.social_media_guidelines ?? {};
  const email = dg.email_guidelines ?? {};
  if (arr(dg.website_principles).length || Object.keys(social).length || Object.keys(email).length) {
    y = sectionHeading("12 · Digital Guidelines", newPage());
    if (arr(dg.website_principles).length) {
      y = subHeading("Website Principles", y);
      for (const r of arr<string>(dg.website_principles)) y = bullet(r, y);
    }
    if (Object.keys(social).length) {
      y = subHeading("Social Media", y);
      if (social.profile_bio_template) y = keyVal("Bio Template", social.profile_bio_template, y);
      if (social.posting_tone) y = keyVal("Posting Tone", social.posting_tone, y);
      if (social.posting_cadence) y = keyVal("Cadence", social.posting_cadence, y);
      if (arr(social.hashtag_strategy).length) y = keyVal("Hashtags", arr<string>(social.hashtag_strategy).join("  "), y);
      if (arr(social.content_pillars).length) { y = subHeading("Content Pillars", y); for (const r of arr<string>(social.content_pillars)) y = bullet(r, y); }
    }
    if (Object.keys(email).length) {
      y = subHeading("Email", y);
      if (email.subject_line_style) y = keyVal("Subject Style", email.subject_line_style, y);
      if (email.greeting_style) y = keyVal("Greeting", email.greeting_style, y);
      if (email.signature_template) y = keyVal("Signature", email.signature_template, y);
      if (arr(email.sample_subject_lines).length) {
        y = subHeading("Sample Subject Lines", y);
        for (const r of arr<string>(email.sample_subject_lines)) y = bullet(r, y);
      }
    }
  }

  /* Implementation roadmap */
  const ir = content.implementation_roadmap ?? {};
  if (arr(ir.phase_1_foundations).length || arr(ir.phase_2_rollout).length || arr(ir.phase_3_optimization).length) {
    y = sectionHeading("13 · Implementation Roadmap", newPage());
    if (arr(ir.phase_1_foundations).length) { y = subHeading("Phase 1 — Foundations", y); for (const r of arr<string>(ir.phase_1_foundations)) y = bullet(r, y); }
    if (arr(ir.phase_2_rollout).length) { y = subHeading("Phase 2 — Rollout", y); for (const r of arr<string>(ir.phase_2_rollout)) y = bullet(r, y); }
    if (arr(ir.phase_3_optimization).length) { y = subHeading("Phase 3 — Optimization", y); for (const r of arr<string>(ir.phase_3_optimization)) y = bullet(r, y); }
    if (ir.governance_notes) { y = subHeading("Governance", y); y = para(ir.governance_notes, y); }
  }

  /* fill TOC page */
  doc.setPage(tocPageIndex);
  doc.setFillColor(255, 255, 255); doc.rect(0, 0, W, H, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(20, 20, 20);
  doc.text("Contents", M, 40);
  doc.setDrawColor(pr, pg, pb); doc.setLineWidth(0.6); doc.line(M, 44, M + 30, 44);
  doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(60);
  let ty = 60;
  for (const s of sections) {
    if (ty > H - M) break;
    doc.text(s.title, M, ty);
    doc.text(String(s.page), W - M, ty, { align: "right" });
    doc.setDrawColor(220); doc.setLineDashPattern([0.6, 0.6], 0);
    doc.line(M + doc.getTextWidth(s.title) + 3, ty - 1, W - M - 6, ty - 1);
    doc.setLineDashPattern([], 0);
    ty += 8;
  }

  return doc.output("blob");
}

/* ════════════════════════════════════════════════════════════
   PPTX
   ════════════════════════════════════════════════════════════ */
export async function generatePPTX(content: BrandContent, inputs: BrandInputs): Promise<Blob> {
  const pptx = new PptxGenJS();
  const primaryHex = (
    content.visual_identity?.color_palette?.primary?.hex ||
    inputs.colorPalette?.primary?.hex ||
    "#0EA5A4"
  ).replace("#", "");
  const darkBg = "0D1117";
  pptx.defineLayout({ name: "L16", width: 13.333, height: 7.5 });
  pptx.layout = "L16";

  const addCover = () => {
    const s = pptx.addSlide();
    s.background = { color: darkBg };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: primaryHex } });
    s.addText("BRAND GUIDELINES", { x: 0.5, y: 1.0, w: 12, h: 0.4, fontSize: 14, bold: true, color: primaryHex, fontFace: "Calibri" });
    s.addText(inputs.brandName, { x: 0.5, y: 1.7, w: 12, h: 1.4, fontSize: 60, bold: true, color: "FFFFFF", fontFace: "Calibri" });
    if (inputs.slogan)
      s.addText(inputs.slogan, { x: 0.5, y: 3.3, w: 12, h: 0.6, fontSize: 22, color: "BBBBBB", italic: true, fontFace: "Calibri" });
    s.addText("A complete brand identity, voice, and application system.", { x: 0.5, y: 6.2, w: 10, h: 0.4, fontSize: 12, color: "888888" });
    s.addText(
      `Prepared ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}`,
      { x: 0.5, y: 6.7, w: 10, h: 0.3, fontSize: 10, color: "666666" },
    );
  };

  const sectionDivider = (num: string, title: string) => {
    const s = pptx.addSlide();
    s.background = { color: darkBg };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: primaryHex } });
    s.addText(num, { x: 0.5, y: 2.6, w: 12, h: 0.8, fontSize: 18, bold: true, color: primaryHex });
    s.addText(title, { x: 0.5, y: 3.2, w: 12, h: 1.5, fontSize: 48, bold: true, color: "FFFFFF" });
  };

  const baseSlide = (heading: string) => {
    const s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.333, h: 0.9, fill: { color: darkBg } });
    s.addShape(pptx.ShapeType.rect, { x: 0, y: 0.9, w: 0.08, h: 6.6, fill: { color: primaryHex } });
    s.addText(heading.toUpperCase(), { x: 0.4, y: 0.2, w: 12, h: 0.5, fontSize: 16, bold: true, color: primaryHex, fontFace: "Calibri" });
    return s;
  };

  const bulletSlide = (heading: string, items: string[]) => {
    const s = baseSlide(heading);
    const filtered = items.filter(Boolean);
    if (!filtered.length) return s;
    s.addText(
      filtered.map((t) => ({ text: t, options: { bullet: { type: "bullet" as const }, fontSize: 14, color: "333333", paraSpaceAfter: 8 } })),
      { x: 0.4, y: 1.1, w: 12.6, h: 6.2, valign: "top", fontFace: "Calibri" },
    );
    return s;
  };

  const textSlide = (heading: string, paragraphs: string[]) => {
    const s = baseSlide(heading);
    const txt = paragraphs.filter(Boolean).map((p) => ({ text: p + "\n\n", options: { fontSize: 14, color: "333333" } }));
    if (txt.length) s.addText(txt, { x: 0.4, y: 1.1, w: 12.6, h: 6.2, valign: "top", fontFace: "Calibri" });
    return s;
  };

  const twoCol = (heading: string, lt: string, l: string[], rt: string, r: string[]) => {
    const s = baseSlide(heading);
    s.addText(lt, { x: 0.4, y: 1.1, w: 6.2, h: 0.5, fontSize: 14, bold: true, color: "111111" });
    s.addText(rt, { x: 6.9, y: 1.1, w: 6, h: 0.5, fontSize: 14, bold: true, color: "111111" });
    if (l.length)
      s.addText(l.map((t) => ({ text: t, options: { bullet: true as const, fontSize: 12, color: "444444", paraSpaceAfter: 5 } })),
        { x: 0.4, y: 1.6, w: 6.2, h: 5.6, valign: "top" });
    if (r.length)
      s.addText(r.map((t) => ({ text: t, options: { bullet: true as const, fontSize: 12, color: "444444", paraSpaceAfter: 5 } })),
        { x: 6.9, y: 1.6, w: 6, h: 5.6, valign: "top" });
  };

  /* Slides */
  addCover();

  const bo = content.brand_overview ?? {};
  sectionDivider("01", "Brand Overview");
  if (bo.brand_story) textSlide("Brand Story", [bo.brand_story]);
  if (bo.mission_statement || bo.vision_statement || bo.brand_promise)
    bulletSlide("Mission · Vision · Promise", [
      bo.mission_statement && `MISSION — ${bo.mission_statement}`,
      bo.vision_statement && `VISION — ${bo.vision_statement}`,
      bo.brand_promise && `PROMISE — ${bo.brand_promise}`,
      bo.unique_value_proposition && `UVP — ${bo.unique_value_proposition}`,
    ].filter(Boolean) as string[]);
  if (arr(bo.core_values).length)
    bulletSlide("Core Values", arr<any>(bo.core_values).map((v) => typeof v === "string" ? v : `${v.name ?? ""} — ${v.description ?? ""}`));
  if (arr(bo.brand_pillars).length)
    bulletSlide("Brand Pillars", arr<any>(bo.brand_pillars).map((p) => `${p.name ?? ""} — ${p.description ?? ""}`));

  const bp = content.brand_positioning ?? {};
  sectionDivider("02", "Brand Positioning");
  if (bp.positioning_statement) textSlide("Positioning Statement", [bp.positioning_statement]);
  if (arr(bp.competitive_differentiators).length) bulletSlide("Differentiators", arr<string>(bp.competitive_differentiators));
  if (arr(bp.competitor_snapshot).length)
    bulletSlide("Competitor Snapshot", arr<any>(bp.competitor_snapshot).map((c) => `${c.name ?? ""} — ${c.positioning ?? ""} · We differ: ${c.how_we_differ ?? ""}`));
  if (arr(bp.messaging_pillars).length)
    bulletSlide("Messaging Pillars", arr<any>(bp.messaging_pillars).flatMap((p) => [p.pillar, ...arr<string>(p.proof_points).map((x) => `   · ${x}`)]).filter(Boolean) as string[]);

  const ta = content.target_audience ?? {};
  const pp = ta.primary_persona ?? {};
  if (pp.name) {
    sectionDivider("03", "Target Audience");
    bulletSlide(`Primary Persona — ${pp.name}`, [
      pp.age_range && `Age: ${pp.age_range}`,
      pp.occupation && `Occupation: ${pp.occupation}`,
      pp.description,
      arr(pp.pain_points).length && `Pain Points: ${arr<string>(pp.pain_points).join(", ")}`,
      arr(pp.goals).length && `Goals: ${arr<string>(pp.goals).join(", ")}`,
      arr(pp.motivations).length && `Motivations: ${arr<string>(pp.motivations).join(", ")}`,
      arr(pp.preferred_channels).length && `Channels: ${arr<string>(pp.preferred_channels).join(", ")}`,
      pp.buying_behavior && `Behavior: ${pp.buying_behavior}`,
    ].filter(Boolean) as string[]);
  }

  const vt = content.voice_and_tone ?? {};
  sectionDivider("04", "Voice & Tone");
  if (vt.personality_description || vt.communication_style)
    textSlide("Personality", [vt.personality_description, vt.communication_style].filter(Boolean) as string[]);
  if (arr(vt.personality_traits).length)
    bulletSlide("Personality Traits", arr<any>(vt.personality_traits).map((t) => `${t.trait ?? ""} — ${t.description ?? ""}`));
  if (arr(vt.lexicon_we_use).length || arr(vt.lexicon_we_avoid).length)
    twoCol("Lexicon", "Words we use", arr<string>(vt.lexicon_we_use), "Words we avoid", arr<string>(vt.lexicon_we_avoid));
  if (arr(vt.dos).length || arr(vt.donts).length)
    twoCol("Do's and Don'ts", "Do", arr<string>(vt.dos), "Don't", arr<string>(vt.donts));
  if (arr(vt.sample_taglines).length) bulletSlide("Sample Taglines", arr<string>(vt.sample_taglines).map((t) => `“${t}”`));
  if (arr(vt.sample_headlines).length) bulletSlide("Sample Headlines", arr<string>(vt.sample_headlines));
  if (arr(vt.sample_social_posts).length) bulletSlide("Sample Social Posts", arr<string>(vt.sample_social_posts));

  /* Color */
  const vi = content.visual_identity ?? {};
  const palette = vi.color_palette ?? {};
  sectionDivider("05", "Color System");
  const palSlide = baseSlide("Color Palette");
  let cx = 0.4;
  for (const key of ["primary", "secondary", "accent", "background", "text"]) {
    const c = ensureColorMeta(palette[key]); if (!c) continue;
    palSlide.addShape(pptx.ShapeType.roundRect, { x: cx, y: 1.2, w: 2.2, h: 2.0, fill: { color: String(c.hex).replace("#", "") }, line: { color: "DDDDDD" }, rectRadius: 0.08 });
    palSlide.addText(String(c.name ?? key), { x: cx, y: 3.3, w: 2.2, h: 0.3, fontSize: 11, bold: true, align: "center", color: "111111" });
    palSlide.addText(String(c.hex).toUpperCase(), { x: cx, y: 3.6, w: 2.2, h: 0.3, fontSize: 10, align: "center", color: "555555" });
    palSlide.addText(`R${c.rgb.r} G${c.rgb.g} B${c.rgb.b}`, { x: cx, y: 3.9, w: 2.2, h: 0.3, fontSize: 9, align: "center", color: "777777" });
    palSlide.addText(`C${c.cmyk.c} M${c.cmyk.m} Y${c.cmyk.y} K${c.cmyk.k}`, { x: cx, y: 4.2, w: 2.2, h: 0.3, fontSize: 9, align: "center", color: "777777" });
    if (c.pantone_suggestion)
      palSlide.addText(String(c.pantone_suggestion), { x: cx, y: 4.5, w: 2.2, h: 0.3, fontSize: 9, italic: true, align: "center", color: "999999" });
    cx += 2.45;
  }
  if (arr(vi.color_usage_rules).length) bulletSlide("Color Usage Rules", arr<string>(vi.color_usage_rules));
  if (arr(vi.color_combinations_recommended).length || arr(vi.color_combinations_avoid).length)
    twoCol("Color Combinations", "Recommended", arr<string>(vi.color_combinations_recommended), "Avoid", arr<string>(vi.color_combinations_avoid));

  /* Typography */
  const typo = vi.typography ?? {};
  sectionDivider("06", "Typography");
  bulletSlide("Typefaces", [
    typo.primary_font && `Primary: ${typo.primary_font}`,
    typo.primary_font_rationale,
    typo.secondary_font && `Secondary: ${typo.secondary_font}`,
    typo.secondary_font_rationale,
  ].filter(Boolean) as string[]);
  if (arr(typo.type_scale).length) {
    bulletSlide("Type Scale", arr<any>(typo.type_scale).map((s) =>
      `${s.level ?? ""} — ${s.font ?? ""} ${s.weight ?? ""} · ${s.size_px ?? ""}${s.size_pt ? ` (${s.size_pt})` : ""} · LH ${s.line_height ?? ""} · ${s.usage ?? ""}`,
    ));
  }
  if (arr(typo.font_usage_rules).length) bulletSlide("Typography Rules", arr<string>(typo.font_usage_rules));

  /* Logo */
  const lg = vi.logo_usage ?? {};
  sectionDivider("07", "Logo Usage");
  bulletSlide("Logo Standards", [
    lg.construction_notes && `Construction: ${lg.construction_notes}`,
    lg.clear_space_rule && `Clear Space: ${lg.clear_space_rule}`,
    lg.minimum_size_digital && `Min Size (Digital): ${lg.minimum_size_digital}`,
    lg.minimum_size_print && `Min Size (Print): ${lg.minimum_size_print}`,
    arr(lg.approved_backgrounds).length && `Backgrounds: ${arr<string>(lg.approved_backgrounds).join(", ")}`,
  ].filter(Boolean) as string[]);
  if (arr(lg.logo_variations).length)
    bulletSlide("Logo Variations", arr<any>(lg.logo_variations).map((v) => `${v.name ?? ""} — ${v.when_to_use ?? ""}`));
  if (arr(lg.forbidden_uses).length) bulletSlide("Logo Don'ts", arr<string>(lg.forbidden_uses));

  /* Imagery */
  const im = vi.imagery_style ?? {};
  if (Object.keys(im).length) {
    sectionDivider("08", "Imagery & Visual Style");
    textSlide("Direction", [im.photography_direction, im.illustration_style, im.iconography_style].filter(Boolean) as string[]);
    if (arr(im.composition_principles).length) bulletSlide("Composition Principles", arr<string>(im.composition_principles));
    if (arr(im.dos).length || arr(im.donts).length) twoCol("Imagery Do's and Don'ts", "Do", arr<string>(im.dos), "Don't", arr<string>(im.donts));
  }

  /* Applications */
  const ap = content.brand_applications ?? {};
  if (Object.values(ap).some((v) => arr(v).length)) {
    sectionDivider("09", "Brand Applications");
    const groups: [string, string][] = [["Digital","digital"],["Print","print"],["Social Media","social_media"],["Merchandise","merchandise"],["Environmental","environmental"],["Packaging","packaging"]];
    for (const [label, key] of groups) {
      const items = arr<string>(ap[key]); if (!items.length) continue;
      bulletSlide(`Applications — ${label}`, items);
    }
  }

  /* Do's & Don'ts */
  const dd = content.brand_dos_donts ?? {};
  if (arr(dd.overall_dos).length || arr(dd.overall_donts).length) {
    sectionDivider("10", "Brand Do's and Don'ts");
    twoCol("Overall Do's and Don'ts", "Do", arr<string>(dd.overall_dos), "Don't", arr<string>(dd.overall_donts));
  }

  /* Accessibility */
  const ac = content.accessibility ?? {};
  if (Object.values(ac).some((v) => arr(v).length)) {
    sectionDivider("11", "Accessibility");
    bulletSlide("Accessibility Principles", [
      ...arr<string>(ac.contrast_principles),
      ...arr<string>(ac.color_blind_considerations),
      ...arr<string>(ac.type_legibility_rules),
      ...arr<string>(ac.inclusive_language_rules),
    ]);
  }

  /* Digital */
  const dg = content.digital_guidelines ?? {};
  const social = dg.social_media_guidelines ?? {};
  const email = dg.email_guidelines ?? {};
  if (arr(dg.website_principles).length || Object.keys(social).length || Object.keys(email).length) {
    sectionDivider("12", "Digital Guidelines");
    if (arr(dg.website_principles).length) bulletSlide("Website Principles", arr<string>(dg.website_principles));
    bulletSlide("Social Media", [
      social.profile_bio_template && `Bio: ${social.profile_bio_template}`,
      social.posting_tone && `Tone: ${social.posting_tone}`,
      social.posting_cadence && `Cadence: ${social.posting_cadence}`,
      arr(social.hashtag_strategy).length && `Hashtags: ${arr<string>(social.hashtag_strategy).join("  ")}`,
      arr(social.content_pillars).length && `Pillars: ${arr<string>(social.content_pillars).join(" · ")}`,
    ].filter(Boolean) as string[]);
    bulletSlide("Email", [
      email.subject_line_style && `Subject style: ${email.subject_line_style}`,
      email.greeting_style && `Greeting: ${email.greeting_style}`,
      email.signature_template && `Signature: ${email.signature_template}`,
      ...arr<string>(email.sample_subject_lines).map((s) => `• ${s}`),
    ].filter(Boolean) as string[]);
  }

  /* Roadmap */
  const ir = content.implementation_roadmap ?? {};
  if (arr(ir.phase_1_foundations).length || arr(ir.phase_2_rollout).length || arr(ir.phase_3_optimization).length) {
    sectionDivider("13", "Implementation Roadmap");
    if (arr(ir.phase_1_foundations).length) bulletSlide("Phase 1 — Foundations", arr<string>(ir.phase_1_foundations));
    if (arr(ir.phase_2_rollout).length) bulletSlide("Phase 2 — Rollout", arr<string>(ir.phase_2_rollout));
    if (arr(ir.phase_3_optimization).length) bulletSlide("Phase 3 — Optimization", arr<string>(ir.phase_3_optimization));
    if (ir.governance_notes) textSlide("Governance", [ir.governance_notes]);
  }

  /* Closing */
  const end = pptx.addSlide();
  end.background = { color: darkBg };
  end.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: primaryHex } });
  end.addText("Thank You", { x: 0.5, y: 2.8, w: 12, h: 1, fontSize: 56, bold: true, color: "FFFFFF", align: "center" });
  end.addText(`${inputs.brandName} — Brand Guidelines`, { x: 0.5, y: 4.0, w: 12, h: 0.5, fontSize: 18, color: primaryHex, align: "center" });

  const buf = (await pptx.write({ outputType: "arraybuffer" })) as ArrayBuffer;
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
}

/* ════════════════════════════════════════════════════════════
   DOCX
   ════════════════════════════════════════════════════════════ */
export async function generateDOCX(content: BrandContent, inputs: BrandInputs): Promise<Blob> {
  const primaryColor = (
    content.visual_identity?.color_palette?.primary?.hex ||
    inputs.colorPalette?.primary?.hex ||
    "#0EA5A4"
  ).replace("#", "");

  const h1 = (t: string) =>
    new Paragraph({
      text: t,
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: primaryColor, space: 1 } },
    });
  const h2 = (t: string) =>
    new Paragraph({ text: t, heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 100 } });
  const h3 = (t: string) =>
    new Paragraph({ text: t, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 80 } });
  const body = (t: string) =>
    new Paragraph({ children: [new TextRun({ text: t, size: 22, color: "333333" })], spacing: { after: 120 } });
  const bullet = (t: string) =>
    new Paragraph({ text: t, bullet: { level: 0 }, spacing: { after: 60 } });
  const quote = (t: string) =>
    new Paragraph({
      children: [new TextRun({ text: `"${t}"`, italics: true, color: primaryColor, size: 24 })],
      spacing: { after: 100 },
      indent: { left: 360 },
    });
  const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
  const kv = (k: string, v: string) =>
    v
      ? new Paragraph({
          children: [
            new TextRun({ text: `${k}: `, bold: true, size: 22, color: "111111" }),
            new TextRun({ text: v, size: 22, color: "333333" }),
          ],
          spacing: { after: 80 },
        })
      : null;

  const tableHeader = (cells: string[]) =>
    new TableRow({
      children: cells.map(
        (c) =>
          new TableCell({
            shading: { fill: primaryColor },
            children: [new Paragraph({ children: [new TextRun({ text: c, bold: true, color: "FFFFFF", size: 20 })] })],
          }),
      ),
    });
  const tableRow = (cells: string[]) =>
    new TableRow({
      children: cells.map(
        (c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, size: 20, color: "333333" })] })] }),
      ),
    });
  const makeTable = (header: string[], rows: string[][]) =>
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [tableHeader(header), ...rows.map((r) => tableRow(r))],
    });

  const bo = content.brand_overview ?? {};
  const vt = content.voice_and_tone ?? {};
  const vi = content.visual_identity ?? {};
  const palette = vi.color_palette ?? {};
  const typo = vi.typography ?? {};
  const lg = vi.logo_usage ?? {};
  const im = vi.imagery_style ?? {};
  const ta = content.target_audience ?? {};
  const pp = ta.primary_persona ?? {};
  const sp = ta.secondary_persona ?? {};
  const bp = content.brand_positioning ?? {};
  const ap = content.brand_applications ?? {};
  const dd = content.brand_dos_donts ?? {};
  const ac = content.accessibility ?? {};
  const dg = content.digital_guidelines ?? {};
  const social = dg.social_media_guidelines ?? {};
  const email = dg.email_guidelines ?? {};
  const ir = content.implementation_roadmap ?? {};

  const children: (Paragraph | Table)[] = [];

  /* Cover */
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "BRAND GUIDELINES", bold: true, size: 22, color: primaryColor, font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 1600, after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({ text: inputs.brandName, bold: true, size: 72, color: "111111", font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
  );
  if (inputs.slogan)
    children.push(
      new Paragraph({
        children: [new TextRun({ text: inputs.slogan, italics: true, size: 30, color: "666666", font: "Calibri" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
    );
  children.push(
    new Paragraph({
      children: [new TextRun({ text: "A complete brand identity, voice, and application system.", size: 22, color: "888888", font: "Calibri" })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      children: [new TextRun({
        text: `Prepared ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}`,
        size: 20, color: "999999", font: "Calibri",
      })],
      alignment: AlignmentType.CENTER,
    }),
    pageBreak(),
  );

  /* Sections helper */
  const push = (...x: (Paragraph | Table | null | undefined)[]) => {
    for (const item of x) if (item) children.push(item);
  };

  /* 01 Overview */
  push(h1("01 · Brand Overview"));
  if (bo.elevator_pitch) push(quote(bo.elevator_pitch));
  if (bo.brand_story) { push(h2("Brand Story"), body(bo.brand_story)); }
  if (bo.mission_statement) { push(h2("Mission"), body(bo.mission_statement)); }
  if (bo.vision_statement) { push(h2("Vision"), body(bo.vision_statement)); }
  if (bo.brand_promise) { push(h2("Brand Promise"), body(bo.brand_promise)); }
  if (bo.unique_value_proposition) { push(h2("Unique Value Proposition"), body(bo.unique_value_proposition)); }
  if (arr(bo.core_values).length) {
    push(h2("Core Values"));
    for (const v of arr<any>(bo.core_values)) {
      const n = typeof v === "string" ? v : v?.name;
      const d = typeof v === "string" ? "" : v?.description;
      push(bullet(d ? `${n} — ${d}` : String(n ?? "")));
    }
  }
  if (arr(bo.brand_pillars).length) {
    push(h2("Brand Pillars"));
    for (const p of arr<any>(bo.brand_pillars)) push(bullet(`${p.name ?? ""} — ${p.description ?? ""}`));
  }
  push(pageBreak());

  /* 02 Positioning */
  push(h1("02 · Brand Positioning"));
  if (bp.positioning_statement) push(h2("Positioning Statement"), quote(bp.positioning_statement));
  if (bp.category_definition) push(h2("Category"), body(bp.category_definition));
  push(kv("Market Category", str(bp.market_category)));
  if (bp.competitive_landscape_notes) push(h2("Competitive Landscape"), body(bp.competitive_landscape_notes));
  if (arr(bp.competitive_differentiators).length) {
    push(h2("Differentiators"));
    for (const d of arr<string>(bp.competitive_differentiators)) push(bullet(d));
  }
  if (arr(bp.competitor_snapshot).length) {
    push(h2("Competitor Snapshot"));
    push(makeTable(
      ["Competitor", "Positioning", "How we differ"],
      arr<any>(bp.competitor_snapshot).map((c) => [c.name ?? "", c.positioning ?? "", c.how_we_differ ?? ""]),
    ));
  }
  if (arr(bp.messaging_pillars).length) {
    push(h2("Messaging Pillars"));
    for (const p of arr<any>(bp.messaging_pillars)) {
      push(h3(str(p.pillar)));
      for (const pf of arr<string>(p.proof_points)) push(bullet(pf));
    }
  }
  push(pageBreak());

  /* 03 Audience */
  push(h1("03 · Target Audience"));
  if (pp.name) {
    push(h2(`Primary Persona — ${pp.name}`));
    push(kv("Age", str(pp.age_range)));
    push(kv("Occupation", str(pp.occupation)));
    if (pp.description) push(body(pp.description));
    if (arr(pp.pain_points).length) { push(h3("Pain Points")); for (const x of arr<string>(pp.pain_points)) push(bullet(x)); }
    if (arr(pp.goals).length) { push(h3("Goals")); for (const x of arr<string>(pp.goals)) push(bullet(x)); }
    if (arr(pp.motivations).length) { push(h3("Motivations")); for (const x of arr<string>(pp.motivations)) push(bullet(x)); }
    if (arr(pp.preferred_channels).length) push(kv("Preferred Channels", arr<string>(pp.preferred_channels).join(", ")));
    push(kv("Buying Behavior", str(pp.buying_behavior)));
  }
  if (sp.name) {
    push(h2(`Secondary Persona — ${sp.name}`));
    push(kv("Age", str(sp.age_range)));
    if (sp.description) push(body(sp.description));
  }
  push(pageBreak());

  /* 04 Voice */
  push(h1("04 · Brand Voice & Tone"));
  push(kv("Primary Tone", str(vt.primary_tone)));
  push(kv("Secondary Tone", str(vt.secondary_tone)));
  if (vt.communication_style) push(h2("Communication Style"), body(vt.communication_style));
  if (vt.personality_description) push(h2("Brand Personality"), body(vt.personality_description));
  if (arr(vt.personality_traits).length) {
    push(h2("Personality Traits"));
    for (const t of arr<any>(vt.personality_traits)) push(bullet(`${t.trait ?? ""} — ${t.description ?? ""}`));
  }
  if (arr(vt.lexicon_we_use).length || arr(vt.lexicon_we_avoid).length) {
    push(h2("Lexicon"));
    const max = Math.max(arr(vt.lexicon_we_use).length, arr(vt.lexicon_we_avoid).length);
    const rows: string[][] = [];
    for (let i = 0; i < max; i++) rows.push([arr<string>(vt.lexicon_we_use)[i] ?? "", arr<string>(vt.lexicon_we_avoid)[i] ?? ""]);
    push(makeTable(["Words we use", "Words we avoid"], rows));
  }
  if (arr(vt.dos).length || arr(vt.donts).length) {
    push(h2("Do's and Don'ts"));
    const max = Math.max(arr(vt.dos).length, arr(vt.donts).length);
    const rows: string[][] = [];
    for (let i = 0; i < max; i++) rows.push([arr<string>(vt.dos)[i] ?? "", arr<string>(vt.donts)[i] ?? ""]);
    push(makeTable(["Do", "Don't"], rows));
  }
  if (arr(vt.sample_taglines).length) {
    push(h2("Sample Taglines"));
    for (const t of arr<string>(vt.sample_taglines)) push(quote(t));
  }
  if (arr(vt.sample_headlines).length) { push(h2("Sample Headlines")); for (const t of arr<string>(vt.sample_headlines)) push(bullet(t)); }
  if (arr(vt.sample_social_posts).length) { push(h2("Sample Social Posts")); for (const t of arr<string>(vt.sample_social_posts)) push(bullet(t)); }
  if (vt.sample_email_intro) push(h2("Sample Email Intro"), body(vt.sample_email_intro));
  if (vt.sample_about_paragraph) push(h2("Sample About Paragraph"), body(vt.sample_about_paragraph));
  push(pageBreak());

  /* 05 Color */
  push(h1("05 · Color System"));
  push(h2("Color Palette"));
  const palOrder = ["primary", "secondary", "accent", "background", "text"];
  const palRows: string[][] = [];
  for (const key of palOrder) {
    const c = ensureColorMeta(palette[key]); if (!c) continue;
    palRows.push([
      key.toUpperCase(), str(c.name), String(c.hex).toUpperCase(),
      `R${c.rgb.r} G${c.rgb.g} B${c.rgb.b}`,
      `C${c.cmyk.c} M${c.cmyk.m} Y${c.cmyk.y} K${c.cmyk.k}`,
      str(c.pantone_suggestion),
    ]);
  }
  if (palRows.length) push(makeTable(["Role", "Name", "HEX", "RGB", "CMYK", "Pantone"], palRows));
  for (const key of palOrder) {
    const c = palette[key]; if (!c?.hex) continue;
    if (c.usage || c.psychology) {
      push(h3(`${str(c.name) || key} — ${String(c.hex).toUpperCase()}`));
      push(kv("Usage", str(c.usage)));
      push(kv("Psychology", str(c.psychology)));
    }
  }
  const neutrals = arr<any>(vi.neutral_palette);
  if (neutrals.length) {
    push(h2("Neutral Palette"));
    push(makeTable(["Name", "HEX", "Usage"], neutrals.map((n) => [str(n.name), String(n.hex ?? "").toUpperCase(), str(n.usage)])));
  }
  if (arr(vi.color_usage_rules).length) { push(h2("Color Usage Rules")); for (const r of arr<string>(vi.color_usage_rules)) push(bullet(r)); }
  if (arr(vi.color_combinations_recommended).length) { push(h2("Recommended Combinations")); for (const r of arr<string>(vi.color_combinations_recommended)) push(bullet(r)); }
  if (arr(vi.color_combinations_avoid).length) { push(h2("Combinations to Avoid")); for (const r of arr<string>(vi.color_combinations_avoid)) push(bullet(r)); }
  push(pageBreak());

  /* 06 Typography */
  push(h1("06 · Typography"));
  push(kv("Primary Typeface", str(typo.primary_font)));
  if (typo.primary_font_rationale) push(body(typo.primary_font_rationale));
  push(kv("Secondary Typeface", str(typo.secondary_font)));
  if (typo.secondary_font_rationale) push(body(typo.secondary_font_rationale));
  push(kv("Heading Style", str(typo.heading_style)));
  push(kv("Body Style", str(typo.body_style)));
  if (arr(typo.type_scale).length) {
    push(h2("Type Scale"));
    push(makeTable(
      ["Level", "Font", "Weight", "Size", "Line height", "Letter spacing", "Usage"],
      arr<any>(typo.type_scale).map((s) => [
        str(s.level), str(s.font), str(s.weight),
        `${str(s.size_px)}${s.size_pt ? ` / ${s.size_pt}` : ""}`,
        str(s.line_height), str(s.letter_spacing), str(s.usage),
      ]),
    ));
  }
  if (arr(typo.font_usage_rules).length) { push(h2("Usage Rules")); for (const r of arr<string>(typo.font_usage_rules)) push(bullet(r)); }
  if (arr(typo.font_pairings).length) { push(h2("Font Pairings")); for (const r of arr<string>(typo.font_pairings)) push(bullet(r)); }
  push(pageBreak());

  /* 07 Logo */
  push(h1("07 · Logo Usage"));
  if (lg.construction_notes) push(h2("Construction"), body(lg.construction_notes));
  push(kv("Clear Space", str(lg.clear_space_rule)));
  push(kv("Minimum Size (Digital)", str(lg.minimum_size_digital)));
  push(kv("Minimum Size (Print)", str(lg.minimum_size_print)));
  if (arr(lg.approved_backgrounds).length) { push(h2("Approved Backgrounds")); for (const r of arr<string>(lg.approved_backgrounds)) push(bullet(r)); }
  if (arr(lg.logo_variations).length) {
    push(h2("Variations"));
    for (const v of arr<any>(lg.logo_variations)) push(bullet(`${v.name ?? ""} — ${v.when_to_use ?? ""}`));
  }
  if (arr(lg.forbidden_uses).length) { push(h2("Don't")); for (const r of arr<string>(lg.forbidden_uses)) push(bullet(r)); }
  if (lg.co_branding_rules) push(h2("Co-Branding"), body(lg.co_branding_rules));
  push(pageBreak());

  /* 08 Imagery */
  if (Object.keys(im).length) {
    push(h1("08 · Imagery & Visual Style"));
    if (im.photography_direction) push(h2("Photography Direction"), body(im.photography_direction));
    if (im.illustration_style) push(h2("Illustration Style"), body(im.illustration_style));
    if (im.iconography_style) push(h2("Iconography"), body(im.iconography_style));
    if (arr(im.composition_principles).length) { push(h2("Composition Principles")); for (const r of arr<string>(im.composition_principles)) push(bullet(r)); }
    push(kv("Color Treatment", str(im.color_treatment)));
    if (arr(im.mood_keywords).length) push(kv("Mood Keywords", arr<string>(im.mood_keywords).join(" · ")));
    if (arr(im.dos).length || arr(im.donts).length) {
      const max = Math.max(arr(im.dos).length, arr(im.donts).length);
      const rows: string[][] = [];
      for (let i = 0; i < max; i++) rows.push([arr<string>(im.dos)[i] ?? "", arr<string>(im.donts)[i] ?? ""]);
      push(makeTable(["Do", "Don't"], rows));
    }
    push(pageBreak());
  }

  /* 09 Applications */
  if (Object.values(ap).some((v) => arr(v).length)) {
    push(h1("09 · Brand Applications"));
    const groups: [string, string][] = [["Digital","digital"],["Print","print"],["Social Media","social_media"],["Merchandise","merchandise"],["Environmental","environmental"],["Packaging","packaging"]];
    for (const [label, key] of groups) {
      const items = arr<string>(ap[key]); if (!items.length) continue;
      push(h2(label));
      for (const it of items) push(bullet(it));
    }
    push(pageBreak());
  }

  /* 10 Do/Don't */
  if (arr(dd.overall_dos).length || arr(dd.overall_donts).length) {
    push(h1("10 · Brand Do's and Don'ts"));
    const max = Math.max(arr(dd.overall_dos).length, arr(dd.overall_donts).length);
    const rows: string[][] = [];
    for (let i = 0; i < max; i++) rows.push([arr<string>(dd.overall_dos)[i] ?? "", arr<string>(dd.overall_donts)[i] ?? ""]);
    push(makeTable(["Do", "Don't"], rows));
    push(pageBreak());
  }

  /* 11 Accessibility */
  if (Object.values(ac).some((v) => arr(v).length)) {
    push(h1("11 · Accessibility"));
    if (arr(ac.contrast_principles).length) { push(h2("Contrast")); for (const r of arr<string>(ac.contrast_principles)) push(bullet(r)); }
    if (arr(ac.color_blind_considerations).length) { push(h2("Color Blindness")); for (const r of arr<string>(ac.color_blind_considerations)) push(bullet(r)); }
    if (arr(ac.type_legibility_rules).length) { push(h2("Type Legibility")); for (const r of arr<string>(ac.type_legibility_rules)) push(bullet(r)); }
    if (arr(ac.inclusive_language_rules).length) { push(h2("Inclusive Language")); for (const r of arr<string>(ac.inclusive_language_rules)) push(bullet(r)); }
    push(pageBreak());
  }

  /* 12 Digital */
  push(h1("12 · Digital Guidelines"));
  if (arr(dg.website_principles).length) { push(h2("Website Principles")); for (const r of arr<string>(dg.website_principles)) push(bullet(r)); }
  if (Object.keys(social).length) {
    push(h2("Social Media"));
    push(kv("Bio Template", str(social.profile_bio_template)));
    push(kv("Posting Tone", str(social.posting_tone)));
    push(kv("Cadence", str(social.posting_cadence)));
    if (arr(social.hashtag_strategy).length) push(kv("Hashtags", arr<string>(social.hashtag_strategy).join("  ")));
    if (arr(social.content_pillars).length) { push(h3("Content Pillars")); for (const r of arr<string>(social.content_pillars)) push(bullet(r)); }
  }
  if (Object.keys(email).length) {
    push(h2("Email"));
    push(kv("Subject Style", str(email.subject_line_style)));
    push(kv("Greeting", str(email.greeting_style)));
    push(kv("Signature", str(email.signature_template)));
    if (arr(email.sample_subject_lines).length) { push(h3("Sample Subject Lines")); for (const r of arr<string>(email.sample_subject_lines)) push(bullet(r)); }
  }

  /* 13 Roadmap */
  if (arr(ir.phase_1_foundations).length || arr(ir.phase_2_rollout).length || arr(ir.phase_3_optimization).length) {
    push(pageBreak(), h1("13 · Implementation Roadmap"));
    if (arr(ir.phase_1_foundations).length) { push(h2("Phase 1 — Foundations")); for (const r of arr<string>(ir.phase_1_foundations)) push(bullet(r)); }
    if (arr(ir.phase_2_rollout).length) { push(h2("Phase 2 — Rollout")); for (const r of arr<string>(ir.phase_2_rollout)) push(bullet(r)); }
    if (arr(ir.phase_3_optimization).length) { push(h2("Phase 3 — Optimization")); for (const r of arr<string>(ir.phase_3_optimization)) push(bullet(r)); }
    if (ir.governance_notes) push(h2("Governance"), body(ir.governance_notes));
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBlob(doc);
}
