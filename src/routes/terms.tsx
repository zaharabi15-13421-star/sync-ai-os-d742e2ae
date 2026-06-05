import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service · BrandSync AI" },
      { name: "description", content: "Terms of Service for BrandSync AI — Integrated Marketing and Intelligence OS." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-16 max-w-3xl mx-auto text-foreground">
      <h1 className="text-3xl font-semibold mb-6">Terms of Service</h1>
      <p className="text-muted-foreground mb-4">Last updated: June 5, 2026</p>
      <section className="space-y-4 text-sm leading-relaxed text-muted-foreground">
        <p>
          Welcome to BrandSync AI. By creating an account or using our services, you agree to these
          Terms of Service. Please read them carefully.
        </p>
        <h2 className="text-lg font-medium text-foreground mt-6">1. Use of the Service</h2>
        <p>You must be at least 18 years old or have legal capacity to enter into this agreement.</p>
        <h2 className="text-lg font-medium text-foreground mt-6">2. Account Security</h2>
        <p>You are responsible for keeping your credentials safe and for all activity under your account.</p>
        <h2 className="text-lg font-medium text-foreground mt-6">3. Acceptable Use</h2>
        <p>Do not use the service for unlawful, harmful, or abusive activities.</p>
        <h2 className="text-lg font-medium text-foreground mt-6">4. Termination</h2>
        <p>We may suspend or terminate accounts that violate these terms.</p>
        <h2 className="text-lg font-medium text-foreground mt-6">5. Contact</h2>
        <p>Questions? Reach us at support@brandsync.ai.</p>
      </section>
    </main>
  );
}
