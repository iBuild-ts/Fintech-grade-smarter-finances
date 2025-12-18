import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-wide text-white/60">About</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">
            A demo that looks like a product
          </h1>
          <p className="mt-5 text-sm leading-6 text-white/70 md:text-base">
            This MVP is designed to be presented to a fintech team: polished UI, functional workflows, and
            credibility features like audit logs and optional blockchain deployments.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Design principles",
              text: "High contrast, premium spacing, consistent radius, and motion used intentionally (not noisy).",
            },
            {
              title: "Product principles",
              text: "Every click does something: search, filter, update, refresh, deploy, export.",
            },
            {
              title: "Demo principles",
              text: "Clear story from data → insight → action → verification.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold">{c.title}</div>
              <div className="mt-2 text-sm text-white/70">{c.text}</div>
            </div>
          ))}
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
