import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — BrandSync AI" },
      { name: "description", content: "BrandSync AI Privacy Policy." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen text-foreground">
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[color:var(--app-bg)]/70 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
          <span className="flex items-center gap-2 font-semibold text-foreground">
            <Shield className="h-4 w-4 text-indigo-400" />
            BrandSync AI
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: June 2, 2026</p>

        <div className="space-y-10 text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Introduction</h2>
            <p>
              BrandSync AI (“we”, “our”, or “us”) respects your privacy and is committed to protecting your personal data.
              This Privacy Policy explains how we collect, use, store, and share information when you use our website at{" "}
              <a href="https://sync-ai-os.lovable.app" className="text-indigo-400 hover:underline">sync-ai-os.lovable.app</a>{" "}
              and the BrandSync AI platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Account information:</strong> name, email address, company name, and billing details when you register.
              </li>
              <li>
                <strong>Usage data:</strong> pages visited, features used, and interactions within the platform.
              </li>
              <li>
                <strong>Device & log data:</strong> IP address, browser type, operating system, and timestamps.
              </li>
              <li>
                <strong>Third-party integrations:</strong> with your consent, data imported from connected advertising and analytics accounts.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>To provide, operate, and improve the BrandSync AI platform.</li>
              <li>To personalize your experience and deliver AI-generated recommendations.</li>
              <li>To process transactions and send billing notifications.</li>
              <li>To communicate updates, security alerts, and support messages.</li>
              <li>To comply with legal obligations and prevent fraud or abuse.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Data Sharing</h2>
            <p>
              We do not sell your personal data. We may share information with:
            </p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>
                <strong>Service providers:</strong> trusted vendors who perform functions on our behalf (hosting, payment processing, analytics).
              </li>
              <li>
                <strong>Legal authorities:</strong> when required by law or to protect our rights.
              </li>
              <li>
                <strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Data Security</h2>
            <p>
              We implement industry-standard security measures including encryption in transit and at rest,
              access controls, and regular security audits. However, no internet-based service can be guaranteed 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Your Rights</h2>
            <p>Depending on your jurisdiction, you may have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 mt-2">
              <li>Access, correct, or delete your personal data.</li>
              <li>Withdraw consent for certain processing activities.</li>
              <li>Request a copy of your data in a portable format.</li>
              <li>Object to or restrict certain uses of your data.</li>
            </ul>
            <p className="mt-3">
              To exercise these rights, contact us at{" "}
              <a href="mailto:bhuiyainrafi@gmail.com" className="text-indigo-400 hover:underline">bhuiyainrafi@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Cookies & Tracking</h2>
            <p>
              We use cookies and similar technologies to remember preferences, analyze traffic, and improve our services.
              You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide services.
              You may request deletion of your account and associated data at any time.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify you of material changes by posting the new policy on this page with an updated date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. Contact Us</h2>
            <p>
              If you have questions or concerns about this Privacy Policy, please reach out at{" "}
              <a href="mailto:bhuiyainrafi@gmail.com" className="text-indigo-400 hover:underline">bhuiyainrafi@gmail.com</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-white/5 mt-12">
        <div className="max-w-4xl mx-auto px-6 py-8 text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <div>© BrandSync AI · The Marketing OS</div>
          <div className="flex items-center gap-6">
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <a className="hover:text-white" href="#">Terms</a>
            <a className="hover:text-white" href="#">Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
