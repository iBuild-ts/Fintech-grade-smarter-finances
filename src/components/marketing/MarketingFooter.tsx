import Link from "next/link";

export function MarketingFooter() {
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

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-8 text-sm text-white/60 md:flex-row md:items-center md:justify-between">
          <div>© {new Date().getFullYear()} Smart Finance Companion. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <a className="hover:text-white" href="#">
              Privacy
            </a>
            <a className="hover:text-white" href="#">
              Terms
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
