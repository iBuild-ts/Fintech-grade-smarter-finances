"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

import { JoinPopup } from "@/components/marketing/JoinPopup";
import { SponsorsMarquee } from "@/components/marketing/SponsorsMarquee";
import { WaitlistForm } from "@/components/marketing/WaitlistForm";

function Section(props: { id?: string; eyebrow?: string; title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <section id={props.id} className="py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          {props.eyebrow ? (
            <div className="text-xs font-semibold tracking-wide text-white/60">{props.eyebrow}</div>
          ) : null}
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-4xl">{props.title}</div>
          <div className="mt-4 text-sm leading-6 text-white/70 md:text-base">{props.subtitle}</div>
        </div>
        {props.children ? <div className="mt-10">{props.children}</div> : null}
      </div>
    </section>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: "easeOut" },
} as const;

export function LandingPage() {
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const shouldOpen = window.location.hash === "#join-popup";
    if (shouldOpen) setJoinOpen(true);

    const onHash = () => {
      if (window.location.hash === "#join-popup") setJoinOpen(true);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="bg-zinc-950 text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-70">
          <div className="absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/40 via-fuchsia-500/25 to-rose-500/30 blur-3xl" />
          <div className="absolute bottom-[-260px] right-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-indigo-500/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-6 pb-10 pt-14 md:pb-16 md:pt-24">
          <motion.div {...fadeUp} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
              Fintech-grade demo · AI insights · Alerts · Budgets · Blockchain
            </div>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight md:text-6xl">
              Shaping smarter finances,
              <span className="block bg-gradient-to-r from-indigo-300 via-fuchsia-200 to-rose-200 bg-clip-text text-transparent">
                with real-time clarity.
              </span>
            </h1>
            <p className="mt-6 text-base leading-7 text-white/70 md:text-lg">
              A sleek personal finance experience where transactions, budgets, alerts, and AI guidance live in one
              place—backed by audit trails and optional blockchain deployments.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
              >
                Launch dashboard
              </Link>
              <button
                type="button"
                onClick={() => setJoinOpen(true)}
                className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Join early access
              </button>
            </div>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.6, delay: 0.05, ease: "easeOut" }}
            className="mt-12 grid gap-4 md:grid-cols-3"
          >
            {[
              {
                title: "Unmatched AI-driven insights",
                text: "Copilot turns your month into clear signals—spending patterns, budget risks, and next best actions.",
              },
              {
                title: "Compliance-first audit trails",
                text: "Sensitive actions get audit-logged so the demo feels enterprise-ready, not a toy.",
              },
              {
                title: "Blockchain-ready workflows",
                text: "Deploy sample contracts on Hardhat or Sepolia and verify transactions on-chain.",
              },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <div className="text-sm font-semibold">{c.title}</div>
                <div className="mt-2 text-sm text-white/70">{c.text}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      <Section
        id="how"
        eyebrow="How it works"
        title="From raw transactions to confident decisions"
        subtitle="The app is structured like a modern fintech product: guided flows, strong UX, and data that updates immediately after actions."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              step: "01",
              title: "Import or seed data",
              text: "Paste CSV or seed demo data and see charts, alerts, and insights populate instantly.",
            },
            {
              step: "02",
              title: "Detect risks & opportunities",
              text: "Alerts highlight anomalies and budget pressure. Insights summarize what changed and why.",
            },
            {
              step: "03",
              title: "Act, then verify",
              text: "Resolve alerts, pin insights, export data—or deploy on-chain contracts for a credibility punch.",
            },
          ].map((s) => (
            <motion.div key={s.step} {...fadeUp} className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-semibold text-white/50">{s.step}</div>
              <div className="mt-2 text-sm font-semibold">{s.title}</div>
              <div className="mt-2 text-sm text-white/70">{s.text}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section
        id="features"
        eyebrow="Features"
        title="Everything a strong demo needs"
        subtitle="Each section is designed to feel real: fast UI responses, polished micro-interactions, and clearly explained value."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Transaction search + inline edits",
              text: "Filter by direction/category and update categories inline for a crisp, modern workflow.",
            },
            {
              title: "Alerts, unread badge, bulk actions",
              text: "Dedicated alerts page with severity/read/resolved filters and one-click bulk updates.",
            },
            {
              title: "Budgets + utilization",
              text: "Track month-to-date spend vs limits and surface pressure before you overshoot.",
            },
            {
              title: "Copilot (AI)",
              text: "Ask what changed this month, what to cut, or how to improve savings—contextual to your data.",
            },
          ].map((f) => (
            <motion.div key={f.title} {...fadeUp} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold">{f.title}</div>
              <div className="mt-2 text-sm text-white/70">{f.text}</div>
            </motion.div>
          ))}
        </div>

        <motion.div
          {...fadeUp}
          className="mt-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold">Built for a fintech presentation</div>
              <div className="mt-2 text-sm text-white/70">
                Clean typography, premium spacing, consistent radius, and animations that feel intentional.
              </div>
            </div>
            <Link
              href="/product"
              className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
            >
              See product details
            </Link>
          </div>
        </motion.div>
      </Section>

      <section className="border-y border-white/10 bg-zinc-950 py-10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-xs font-semibold tracking-wide text-white/60">Trusted by teams building fintech demos</div>
            <div className="text-xs text-white/60">A sliding strip for credibility (modeled after the reference).</div>
          </div>

          <div className="mt-6">
            <SponsorsMarquee
              items={[
                "Unbound-style UI",
                "Fintech-grade spacing",
                "AI Copilot",
                "Audit Trails",
                "Sepolia Deploy",
                "Realtime Filters",
                "Alerts Ops",
                "Exports",
              ]}
            />
          </div>
        </div>
      </section>

      <Section
        eyebrow="Testimonials"
        title="Loved by builders"
        subtitle="Short quotes make the landing feel like a real product. Replace with real testimonials when you have them."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              quote: "One of the cleanest demo dashboards I’ve seen — looks enterprise-ready.",
              name: "Mark Williams",
              role: "Product Lead",
            },
            {
              quote: "The alerts + bulk actions are exactly what I needed for a convincing fintech walkthrough.",
              name: "Aisha Bello",
              role: "PM, Risk",
            },
            {
              quote: "Sepolia deploy + Etherscan links is a great credibility punch in a demo.",
              name: "Daniel Chen",
              role: "Engineer",
            },
          ].map((t) => (
            <motion.div key={t.name} {...fadeUp} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm text-white/80">“{t.quote}”</div>
              <div className="mt-4 text-sm font-semibold">{t.name}</div>
              <div className="mt-1 text-xs text-white/60">{t.role}</div>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section
        id="join"
        eyebrow="Join"
        title="Ready to take the first step?"
        subtitle="Open the app, seed demo data, and walk through a full story: transactions → insights → alerts → blockchain."
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setJoinOpen(true)}
            className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Join waitlist
          </button>
          <Link
            href="/dashboard"
            className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
          >
            Go to dashboard
          </Link>
        </div>
      </Section>

      <JoinPopup
        open={joinOpen}
        onClose={() => {
          setJoinOpen(false);
          if (typeof window !== "undefined" && window.location.hash === "#join-popup") {
            history.replaceState(null, "", window.location.pathname);
          }
        }}
        title="Join the Smart Finance Beta"
        subtitle="Get early access & rewards. (Demo modal — wire to a real backend when ready.)"
      >
        <WaitlistForm onSubmitted={() => null} />
      </JoinPopup>
    </div>
  );
}
