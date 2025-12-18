"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { PropsWithChildren, useEffect, useState } from "react";
import {
  BadgeCheck,
  Blocks,
  ChartNoAxesCombined,
  FileDown,
  Bell,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  X,
  Settings,
  ShieldCheck,
} from "lucide-react";

function NavItem(props: {
  href: string;
  label: string;
  icon: React.ReactNode;
  badgeText?: string;
}) {
  const pathname = usePathname();
  const active = pathname === props.href;

  return (
    <Link
      href={props.href}
      className={
        active
          ? "flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
          : "flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70 hover:bg-white/5"
      }
    >
      <span className={active ? "text-white" : "text-white/50"}>{props.icon}</span>
      <span className={active ? "text-white" : "text-white"}>{props.label}</span>
      {props.badgeText ? (
        <span
          className={
            active
              ? "ml-auto rounded-full bg-white/15 px-2 py-0.5 text-xs text-white"
              : "ml-auto rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/80"
          }
        >
          {props.badgeText}
        </span>
      ) : null}
    </Link>
  );
}

export function AppShell({ children }: PropsWithChildren) {
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ethAddress = "0xdf49e29b6840d7ba57e4b5acddc770047f67ff13";
  const ethLink = `https://etherscan.io/address/${ethAddress}`;

  useEffect(() => {
    if (!session?.user?.email) return;
    let alive = true;

    const tick = async () => {
      const r = await fetch("/api/alerts/unread-count").catch(() => null);
      if (!r || !r.ok) return;
      const data = (await r.json()) as { count: number };
      if (alive) setUnreadCount(data.count);
    };

    tick().catch(() => null);
    const id = window.setInterval(() => {
      tick().catch(() => null);
    }, 10_000);

    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [session?.user?.email]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-70">
        <div className="absolute left-1/2 top-[-240px] h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-500/35 via-fuchsia-500/20 to-rose-500/25 blur-3xl" />
        <div className="absolute bottom-[-260px] right-[-120px] h-[560px] w-[560px] rounded-full bg-gradient-to-br from-emerald-500/15 via-cyan-500/15 to-indigo-500/15 blur-3xl" />
      </div>

      <div className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/60 backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="text-sm font-semibold">
            Smart Finance
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Marketing
          </Link>
        </div>
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          />

          <div className="relative h-full w-[320px] max-w-[85vw] border-r border-white/10 bg-zinc-950 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">Smart Finance</div>
                  <div className="text-xs text-white/60">Companion MVP</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-1">
              <div onClick={() => setMobileOpen(false)}>
                <NavItem href="/dashboard" label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} />
              </div>
              <div onClick={() => setMobileOpen(false)}>
                <NavItem
                  href="/alerts"
                  label="Alerts"
                  icon={<Bell className="h-4 w-4" />}
                  badgeText={unreadCount > 0 ? String(unreadCount) : undefined}
                />
              </div>
              <div onClick={() => setMobileOpen(false)}>
                <NavItem href="/transactions" label="Transactions" icon={<List className="h-4 w-4" />} />
              </div>
              <div onClick={() => setMobileOpen(false)}>
                <NavItem href="/budgets" label="Budgets" icon={<ChartNoAxesCombined className="h-4 w-4" />} />
              </div>
              <div onClick={() => setMobileOpen(false)}>
                <NavItem href="/copilot" label="Copilot" icon={<BadgeCheck className="h-4 w-4" />} />
              </div>
              <div onClick={() => setMobileOpen(false)}>
                <NavItem href="/blockchain" label="Blockchain" icon={<Blocks className="h-4 w-4" />} />
              </div>
              <div onClick={() => setMobileOpen(false)}>
                <NavItem href="/exports" label="Exports" icon={<FileDown className="h-4 w-4" />} />
              </div>
              <div onClick={() => setMobileOpen(false)}>
                <NavItem href="/settings" label="Settings" icon={<Settings className="h-4 w-4" />} />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Signed in as</div>
              <div className="mt-0.5 truncate text-sm font-medium">{session?.user?.email ?? "—"}</div>

              <button
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-7xl gap-6 px-6 py-6">
        <aside className="hidden w-64 flex-shrink-0 md:block">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-rose-500 text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">Smart Finance</div>
                <div className="text-xs text-white/60">Companion MVP</div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
              <div className="text-xs text-white/60">App</div>
              <Link href="/" className="text-xs font-semibold text-white/80 hover:text-white">
                Marketing
              </Link>
            </div>

            <div className="mt-4 space-y-1">
              <NavItem
                href="/dashboard"
                label="Dashboard"
                icon={<LayoutDashboard className="h-4 w-4" />}
              />
              <NavItem
                href="/alerts"
                label="Alerts"
                icon={<Bell className="h-4 w-4" />}
                badgeText={unreadCount > 0 ? String(unreadCount) : undefined}
              />
              <NavItem href="/transactions" label="Transactions" icon={<List className="h-4 w-4" />} />
              <NavItem href="/budgets" label="Budgets" icon={<ChartNoAxesCombined className="h-4 w-4" />} />
              <NavItem href="/copilot" label="Copilot" icon={<BadgeCheck className="h-4 w-4" />} />
              <NavItem href="/blockchain" label="Blockchain" icon={<Blocks className="h-4 w-4" />} />
              <NavItem href="/exports" label="Exports" icon={<FileDown className="h-4 w-4" />} />
              <NavItem href="/settings" label="Settings" icon={<Settings className="h-4 w-4" />} />
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-white/60">Signed in as</div>
              <div className="mt-0.5 truncate text-sm font-medium">
                {session?.user?.email ?? "—"}
              </div>

              <button
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white/90"
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur">
            <div className="border-b border-white/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Smart Finance Companion</div>
                  <div className="text-xs text-white/60">
                    Local demo: analytics + copilot + blockchain + audit
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6">{children}</div>
          </div>

          <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-white/60 backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>© 2025 Built with ❤️ by Horlah.</div>

              <div className="flex flex-col gap-2 md:items-end">
                <div>
                  Buy me a coffee with ETH:{" "}
                  <a className="font-mono text-white/70 hover:text-white" href={ethLink} target="_blank" rel="noreferrer">
                    {ethAddress}
                  </a>
                </div>

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
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
