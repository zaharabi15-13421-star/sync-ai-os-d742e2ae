import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect } from "react";
import { getWebBrandBook } from "@/lib/brand-guideline-gen.functions";
import { ChevronDown, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/brand-book/$slug")({
  loader: async ({ params }) => {
    const r = (await getWebBrandBook({ data: { slug: params.slug } })) as { book: any };
    if (!r.book) throw notFound();
    return { book: r.book };
  },
  head: ({ loaderData }) => {
    const name = loaderData?.book?.brand_data?.summary?.brand_name ?? "Brand Book";
    return {
      meta: [
        { title: `${name} — Brand Book` },
        { name: "description", content: `Official brand guidelines and identity for ${name}.` },
        { property: "og:title", content: `${name} — Brand Book` },
        { property: "og:description", content: `Official brand guidelines and identity for ${name}.` },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A14] text-[#E2E8F0]">
      <div className="text-center">
        <div className="text-3xl font-bold">Brand book not found</div>
        <div className="mt-2 text-[#94A3B8]">This link doesn't exist or is private.</div>
        <a href="https://sync-ai-os.lovable.app" className="mt-6 inline-block text-[#A78BFA] hover:underline">
          Back to BrandSync AI
        </a>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0A14] text-[#E2E8F0]">
      <div className="text-center">
        <div className="text-3xl font-bold">Something went wrong</div>
        <div className="mt-2 text-[#94A3B8]">Please try again later.</div>
      </div>
    </div>
  ),
  component: BrandBookPage,
});

function BrandBookPage() {
  const { book } = Route.useLoaderData();
  const data = book.brand_data ?? {};
  const summary = data.summary ?? {};
  const content = data.content ?? {};
  const brandName = summary.brand_name ?? "Brand";
  const tagline = summary.tagline ?? content.brand_overview?.brand_story?.split(".")[0];
  const logoUrl = summary.logo_url;

  const primaryColor =
    summary.brand_colors?.[0]?.hex ??
    content.visual_identity?.color_palette?.primary?.hex ??
    "#7C3AED";

  useEffect(() => {
    const original = document.body.style.background;
    document.body.style.background = "#0A0A14";
    return () => { document.body.style.background = original; };
  }, []);

  const rgb = hexToRgb(primaryColor);

  return (
    <div className="min-h-screen text-[#E2E8F0]" style={{ background: "#0A0A14", fontFamily: "Inter, system-ui" }}>
      {/* HERO */}
      <section
        className="min-h-screen flex items-center justify-center px-6"
        style={{
          background: `radial-gradient(ellipse at 50% 40%, rgba(${rgb},0.15) 0%, transparent 70%), #0A0A14`,
        }}
      >
        <div className="max-w-3xl text-center">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="mx-auto" style={{ maxWidth: 200, maxHeight: 80, objectFit: "contain" }} />
          ) : (
            <div
              className="mx-auto rounded-full flex items-center justify-center text-3xl font-bold"
              style={{ width: 96, height: 96, background: primaryColor, color: "white" }}
            >
              {brandName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="mt-8 font-extrabold" style={{ fontSize: 56, lineHeight: 1.05 }}>
            {brandName}
          </h1>
          {tagline && (
            <p className="mt-3 italic" style={{ fontSize: 22, color: "rgba(226,232,240,0.7)" }}>
              {tagline}
            </p>
          )}
          <div className="mx-auto my-8" style={{ width: 60, height: 2, background: primaryColor }} />
          {content.brand_overview?.brand_story && (
            <p style={{ fontSize: 18, lineHeight: 1.8, color: "rgba(226,232,240,0.8)" }}>
              {String(content.brand_overview.brand_story).split("\n\n")[0]}
            </p>
          )}
          <ChevronDown className="mx-auto mt-12 animate-bounce text-[#A78BFA]" />
        </div>
      </section>

      <Section number="01" label="Brand Identity" title="Who We Are" color={primaryColor}>
        <div className="grid md:grid-cols-3 gap-8">
          <Field label="Mission" value={content.brand_overview?.mission_statement} />
          <Field label="Vision" value={content.brand_overview?.vision_statement} />
          <Field label="Unique Value" value={content.brand_overview?.unique_value_proposition} />
        </div>
        {content.brand_positioning?.positioning_statement && (
          <blockquote className="mt-12 italic" style={{ fontSize: 28, color: primaryColor, lineHeight: 1.4 }}>
            "{content.brand_positioning.positioning_statement}"
          </blockquote>
        )}
      </Section>

      <Section number="02" label="Visual Identity" title="The Look & Feel" color={primaryColor} dark>
        {summary.brand_colors && summary.brand_colors.length > 0 && (
          <>
            <div className="text-sm uppercase tracking-widest text-[#94A3B8] mb-6">Color Palette</div>
            <div className="flex flex-wrap gap-8">
              {summary.brand_colors.map((c: any, i: number) => (
                <div key={i} className="text-center">
                  <div
                    className="mx-auto rounded-full"
                    style={{ width: 120, height: 120, background: c.hex, border: "1px solid rgba(255,255,255,0.1)" }}
                  />
                  <div className="mt-3 font-mono text-sm">{c.hex}</div>
                  <div className="text-xs text-[#94A3B8] mt-1">{c.role || c.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {summary.typography && summary.typography.length > 0 && (
          <div className="mt-16">
            <div className="text-sm uppercase tracking-widest text-[#94A3B8] mb-6">Typography</div>
            <div className="space-y-8">
              {summary.typography.map((t: any, i: number) => (
                <div key={i}>
                  <div style={{ fontFamily: t.font, fontSize: 72, lineHeight: 1 }}>Aa Bb Cc 123</div>
                  <div className="mt-2 text-[#E2E8F0] text-lg">{t.font}</div>
                  <div className="text-sm text-[#94A3B8]">{t.usage}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section number="03" label="Brand Personality" title="How We Show Up" color={primaryColor}>
        {content.voice_and_tone?.primary_tone && (
          <div className="text-center" style={{ fontSize: 48, color: primaryColor, fontWeight: 700 }}>
            {content.voice_and_tone.primary_tone}
          </div>
        )}
        {content.brand_overview?.core_values && (
          <div className="mt-12 flex flex-wrap gap-3 justify-center">
            {content.brand_overview.core_values.map((v: string, i: number) => (
              <span
                key={i}
                className="rounded-full px-5 py-2"
                style={{ background: `rgba(${rgb},0.15)`, border: `1px solid ${primaryColor}`, color: "#E2E8F0", fontSize: 16 }}
              >
                {v}
              </span>
            ))}
          </div>
        )}
        {(content.voice_and_tone?.dos || content.voice_and_tone?.donts) && (
          <div className="mt-16 grid md:grid-cols-2 gap-8">
            <div>
              <div className="text-sm uppercase tracking-widest text-[#22C55E] mb-4">Do Say</div>
              <ul className="space-y-3">
                {(content.voice_and_tone.dos ?? []).map((d: string, i: number) => (
                  <li key={i} className="rounded-lg p-4" style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-sm uppercase tracking-widest text-[#EF4444] mb-4">Don't Say</div>
              <ul className="space-y-3">
                {(content.voice_and_tone.donts ?? []).map((d: string, i: number) => (
                  <li key={i} className="rounded-lg p-4" style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Section>

      <Section number="04" label="Brand Voice" title="What We Sound Like" color={primaryColor} dark>
        {content.voice_and_tone?.sample_taglines && (
          <div>
            <div className="text-sm uppercase tracking-widest text-[#94A3B8] mb-6">Sample Taglines</div>
            <div className="grid md:grid-cols-3 gap-6">
              {content.voice_and_tone.sample_taglines.map((t: string, i: number) => (
                <div
                  key={i}
                  className="rounded-2xl p-8 text-xl italic"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: primaryColor }}
                >
                  "{t}"
                </div>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section number="05" label="Strategic Recommendations" title="What's Next" color={primaryColor}>
        {content.digital_guidelines?.website_principles && (
          <ol className="space-y-6">
            {content.digital_guidelines.website_principles.map((p: string, i: number) => (
              <li key={i} className="flex gap-6 items-start">
                <div style={{ fontSize: 56, fontWeight: 800, color: primaryColor, lineHeight: 1, minWidth: 80 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div className="text-lg text-[#E2E8F0] mt-3">{p}</div>
              </li>
            ))}
          </ol>
        )}
      </Section>

      {/* FOOTER */}
      <footer style={{ background: "#050509", padding: "60px 24px" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start gap-8">
          <div>
            <div className="flex items-center gap-3">
              {logoUrl && (
                <img src={logoUrl} alt="" style={{ width: 40, height: 40, objectFit: "contain", background: "white", borderRadius: 8 }} />
              )}
              <div className="text-xl font-bold">{brandName}</div>
            </div>
            <div className="mt-4 text-sm text-[#94A3B8]">
              Generated by{" "}
              <a href="https://sync-ai-os.lovable.app" className="text-[#A78BFA] hover:underline inline-flex items-center gap-1">
                BrandSync AI <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="mt-1 text-xs text-[#64748B]">
              Created {new Date(book.created_at).toLocaleDateString()}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Link copied");
              }}
              className="rounded-lg px-5 py-2.5 text-sm font-medium"
              style={{ background: primaryColor, color: "white" }}
            >
              Copy Link
            </button>
            <a
              href="https://sync-ai-os.lovable.app"
              className="rounded-lg px-5 py-2.5 text-sm text-center"
              style={{ border: "1px solid rgba(255,255,255,0.15)", color: "#E2E8F0" }}
            >
              <Sparkles className="inline h-3.5 w-3.5 mr-1.5" />
              Build your own
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Section({
  number, label, title, color, dark, children,
}: { number: string; label: string; title: string; color: string; dark?: boolean; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: dark ? "rgba(255,255,255,0.02)" : "transparent",
        padding: "80px 24px",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color }}>
          {number} — {label}
        </div>
        <h2 className="font-bold mb-12" style={{ fontSize: 40 }}>
          {title}
        </h2>
        {children}
      </div>
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-[#94A3B8] mb-3">{label}</div>
      <div className="text-base text-[#E2E8F0] leading-relaxed">{value}</div>
    </div>
  );
}

function hexToRgb(hex: string): string {
  const h = (hex || "#7C3AED").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return `${parseInt(v.slice(0, 2), 16) || 0},${parseInt(v.slice(2, 4), 16) || 0},${parseInt(v.slice(4, 6), 16) || 0}`;
}
