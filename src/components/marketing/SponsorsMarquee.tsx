"use client";

export function SponsorsMarquee(props: { items: string[] }) {
  const items = props.items.length ? props.items : ["Partners", "Sponsors", "Backed By", "Trusted", "Builders"];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-zinc-950 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-zinc-950 to-transparent" />

      <div className="py-6">
        <div className="marquee inline-flex w-max gap-3 px-6">
          {[...items, ...items].map((name, idx) => (
            <div
              key={`${name}-${idx}`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold tracking-wide text-white/70"
            >
              {name}
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .marquee {
          animation: marquee 18s linear infinite;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .marquee {
            animation: none;
          }
        }

        @keyframes marquee {
          0% {
            transform: translate3d(0, 0, 0);
          }
          100% {
            transform: translate3d(-50%, 0, 0);
          }
        }
      `}</style>
    </div>
  );
}
