import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <MarketingHeader />
      <main className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="text-xs font-semibold tracking-wide text-white/60">Product</div>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-5xl">Built like a real fintech app</h1>
          <p className="mt-5 text-sm leading-6 text-white/70 md:text-base">
            Smart Finance Companion is a demo-ready personal finance product: fast dashboards, searchable
            transactions, risk alerts, AI copilot guidance, and optional blockchain deployments.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[
            {
              title: "Dashboard that tells a story",
              text: "Charts, month summary, quick actions, and clear empty states to guide the demo flow.",
            },
            {
              title: "Transactions that feel editable",
              text: "Search, filter, and inline categorize transactions—no clunky modal workflows.",
            },
            {
              title: "Alerts that feel operational",
              text: "Unread counts, bulk actions, and resolve workflows—like a real monitoring product.",
            },
            {
              title: "Blockchain credibility",
              text: "Deploy sample contracts on Hardhat or Sepolia and verify on Etherscan.",
            },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="text-sm font-semibold">{c.title}</div>
              <div className="mt-2 text-sm text-white/70">{c.text}</div>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-6">
          <div className="text-sm font-semibold">Suggested demo flow</div>
          <div className="mt-3 text-sm text-white/70">
            1) Sign in → 2) Seed demo data → 3) Review insights/alerts → 4) Fix categories → 5) Deploy on Sepolia.
          </div>
        </div>
      </main>
      <MarketingFooter />
    </div>
  );
}
