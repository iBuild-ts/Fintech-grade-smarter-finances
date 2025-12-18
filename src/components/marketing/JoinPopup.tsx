"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function JoinPopup(
  props: PropsWithChildren<{ open: boolean; onClose: () => void; title?: string; subtitle?: string }>,
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!props.open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") props.onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [props.open, props.onClose]);

  if (!mounted || !props.open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60 backdrop-blur"
        onClick={props.onClose}
      />

      <div className="relative mx-auto mt-24 w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-white/10 bg-zinc-950 p-6 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold">{props.title ?? "Join the Beta"}</div>
            <div className="mt-2 text-sm text-white/70">
              {props.subtitle ??
                "Get early access, try the demo flows, and help shape the product. (This is a demo modal—wire to your form later.)"}
            </div>
          </div>
          <button
            type="button"
            onClick={props.onClose}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10"
          >
            Close
          </button>
        </div>

        <div className="mt-6">{props.children}</div>
      </div>
    </div>,
    document.body,
  );
}
