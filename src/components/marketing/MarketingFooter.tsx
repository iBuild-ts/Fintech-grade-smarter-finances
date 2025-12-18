import Link from "next/link";

export function MarketingFooter() {
  const ethAddress = "0xdf49e29b6840d7ba57e4b5acddc770047f67ff13";
  const ethLink = `https://etherscan.io/address/${ethAddress}`;

  return (
    <footer className="border-t border-white/10 bg-zinc-950">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-sm font-semibold text-white">Smart Finance Companion</div>
            <div className="mt-3 max-w-md text-sm text-white/70">
              A fintech-grade demo: AI insights, budgets, alerts, and blockchain deployments—wrapped in a sleek,
              modern experience.
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-white/60">Product</div>
            <div className="mt-3 space-y-2 text-sm">
              <Link href="/product" className="block text-white/70 hover:text-white">
                Overview
              </Link>
              <Link href="/#features" className="block text-white/70 hover:text-white">
                Features
              </Link>
              <Link href="/signin" className="block text-white/70 hover:text-white">
                Sign in
              </Link>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold tracking-wide text-white/60">Company</div>
            <div className="mt-3 space-y-2 text-sm">
              <Link href="/about" className="block text-white/70 hover:text-white">
                About
              </Link>
              <Link href="/#join" className="block text-white/70 hover:text-white">
                Join
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="text-sm text-white/60">
              © 2025 Smart Finance Companion. Built with ❤️ by Horlah.
            </div>

            <div className="space-y-3 text-sm text-white/60">
              <div>
                Buy me a coffee with ETH: <span className="font-mono text-white/70">{ethAddress}</span>
              </div>
              <a
                className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                href={ethLink}
                target="_blank"
                rel="noreferrer"
              >
                💰 Send ETH
              </a>
              <div className="flex flex-wrap items-center gap-4">
                <a className="hover:text-white" href="https://x.com/lahwealth" target="_blank" rel="noreferrer">
                  Twitter/X: @lahwealth
                </a>
                <a
                  className="hover:text-white"
                  href="https://www.upwork.com/freelancers/~01857093015b424e00"
                  target="_blank"
                  rel="noreferrer"
                >
                  Hire me on Upwork
                </a>
              </div>
              <div className="text-xs text-white/50">
                Made with ❤️ by{" "}
                <a className="text-white/70 hover:text-white" href="https://x.com/lahwealth" target="_blank" rel="noreferrer">
                  @lahwealth
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
