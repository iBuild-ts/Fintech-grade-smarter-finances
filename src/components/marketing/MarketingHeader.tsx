import Link from "next/link";

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/60 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 text-sm font-semibold text-white">
            SF
          </span>
          <span className="text-sm font-semibold text-white">Smart Finance</span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-white/70 md:flex">
          <Link href="/product" className="transition hover:text-white">
            Product
          </Link>
          <Link href="/about" className="transition hover:text-white">
            About
          </Link>
          <Link href="/#how" className="transition hover:text-white">
            How it works
          </Link>
          <Link href="/#features" className="transition hover:text-white">
            Features
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/#join-popup"
            className="hidden rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 md:inline-flex"
          >
            Join
          </Link>
          <Link
            href="/signin"
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
          >
            Open app
          </Link>
        </div>
      </div>
    </header>
  );
}
