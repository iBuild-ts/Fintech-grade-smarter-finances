"use client";

import { useState } from "react";

export function WaitlistForm(props: { onSubmitted?: () => void }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        setBusy(true);
        try {
          await new Promise((r) => setTimeout(r, 450));
          setMsg("Thanks — you’re on the list (demo). Use Sign in to explore the app.");
          props.onSubmitted?.();
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block">
        <div className="text-xs font-semibold tracking-wide text-white/60">Email</div>
        <input
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/40"
          placeholder="you@company.com"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={busy}
        />
      </label>

      {msg ? <div className="text-sm text-emerald-200">{msg}</div> : null}

      <button
        className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white/90 disabled:opacity-60"
        type="submit"
        disabled={busy}
      >
        {busy ? "Submitting…" : "Join waitlist"}
      </button>
    </form>
  );
}
