import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ScanLine, Shield, Lock, Database, Mail, Cookie, UserCheck } from "lucide-react";

export const Route = createFileRoute("/trust")({
  head: () => ({
    meta: [
      { title: "Trust & Privacy — RAPscanz" },
      { name: "description", content: "How RAPscanz handles your data, security controls in place, and how to contact us about privacy." },
      { property: "og:title", content: "RAPscanz Trust & Privacy" },
      { property: "og:description", content: "Security, privacy, and data-handling practices for RAPscanz users." },
    ],
  }),
  component: TrustPage,
});

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-3 flex items-center gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">{children}</div>
    </section>
  );
}

function TrustPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              <ScanLine className="h-4 w-4" />
            </div>
            RAPscanz
          </Link>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Trust & Privacy</h1>
            <p className="text-sm text-muted-foreground">
              This page is maintained by the RAPscanz team to answer common questions about how we handle your data and secure the app. It is not an independent certification.
            </p>
          </div>
        </div>

        <Section icon={UserCheck} title="Accounts & Authentication">
          <p>Sign-in is handled by our authentication provider. Passwords are never stored in plaintext, and one account is allowed per email address.</p>
          <p>Only you can read or edit your own profile, scans, and consumption history — enforced by per-row access rules in the database.</p>
        </Section>

        <Section icon={Database} title="What We Collect">
          <ul className="list-disc pl-5 space-y-1">
            <li>Account info: email, optional username.</li>
            <li>Health profile you choose to provide: weight, height, gender, illnesses, allergies.</li>
            <li>Scan history: product names, ingredients you submit, generated health analysis, and items you mark as consumed.</li>
          </ul>
          <p>We use this information to personalize health insights and to compute your weekly intake. We do not sell your personal data.</p>
        </Section>

        <Section icon={Lock} title="Security Controls">
          <ul className="list-disc pl-5 space-y-1">
            <li>Data is transmitted over HTTPS/TLS.</li>
            <li>Database access uses row-level security so each user can only access their own rows.</li>
            <li>Privileged operations (quota enforcement, leaderboard aggregation) run server-side and cannot be tampered with from the browser.</li>
            <li>Plan/subscription columns cannot be modified by users directly — only by trusted server logic.</li>
          </ul>
        </Section>

        <Section icon={Cookie} title="Cookies & Analytics">
          <p>We use only the cookies/local storage required to keep you signed in. We do not run third-party advertising trackers.</p>
        </Section>

        <Section icon={Shield} title="Subprocessors">
          <p>RAPscanz relies on hosting and database infrastructure provided by Lovable Cloud, and on an AI model gateway used to analyze ingredient lists. These providers process data on our behalf.</p>
        </Section>

        <Section icon={Mail} title="Privacy Requests & Contact">
          <p>You can update or delete your health profile and scan history at any time from inside the app. For account deletion or other privacy requests, contact the team via the email listed on the homepage.</p>
        </Section>

        <p className="text-xs text-muted-foreground">
          RAPscanz provides general informational analysis of food ingredients and is not a medical service. Always consult a qualified professional for medical advice.
        </p>
      </main>
    </div>
  );
}
