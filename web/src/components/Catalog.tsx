import { TIERS, links } from "../config";

function MiniCard({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 46" className="w-24" aria-hidden>
      <rect x="2" y="4" width="112" height="30" rx="3" fill="#0c1116" stroke={color} strokeOpacity="0.5" />
      <circle cx="26" cy="19" r="9" fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="1.5" />
      <circle cx="26" cy="19" r="1.8" fill={color} />
      <circle cx="58" cy="19" r="9" fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="1.5" />
      <circle cx="58" cy="19" r="1.8" fill={color} />
      <rect x="76" y="12" width="28" height="3" fill={color} fillOpacity="0.5" />
      <rect x="76" y="19" width="20" height="3" fill={color} fillOpacity="0.3" />
      <rect x="10" y="36" width="64" height="4" fill={color} fillOpacity="0.45" />
    </svg>
  );
}

export function Catalog() {
  return (
    <section id="cards" className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-bold tracking-tight">The cards</h2>
        <a href={links.openSea} target="_blank" rel="noreferrer" className="label transition-colors hover:text-accent">
          view collection on opensea ↗
        </a>
      </div>
      <p className="mb-8 max-w-lg text-[13px] leading-6 text-muted">
        Every mint rolls a tier from randomness committed before your transaction. Fuse two identical
        cards into the next tier — two retire, one is forged, forever.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TIERS.map((t) => (
          <div key={t.name} className="tiercard p-4">
            <div className="flex items-baseline justify-between">
              <span className="label" style={{ color: t.color }}>
                {t.rarity}
              </span>
              <span className="num text-[11px] text-muted">{t.odds}</span>
            </div>
            <div className="mt-4 flex justify-center">
              <MiniCard color={t.color} />
            </div>
            <div className="mt-4 text-sm font-semibold">{t.name}</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="num text-lg" style={{ color: t.color }}>
                {t.mh.toLocaleString()}
              </span>
              <span className="label">mh/s</span>
            </div>
            <div className="mt-3 h-[3px] w-full bg-line">
              <div
                className="h-[3px]"
                style={{ width: `${Math.max(2, Math.min(100, (t.mh / 2500) * 100))}%`, background: t.color }}
              />
            </div>
          </div>
        ))}
        <div className="tiercard flex flex-col justify-center p-4">
          <div className="label text-ink">fusion</div>
          <p className="mt-3 text-[13px] leading-6 text-muted">
            2 × same tier + a small fee → 1 × next tier at level zero. Only 10,000 cards will ever be
            made, and fusion only shrinks that number.
          </p>
        </div>
      </div>
    </section>
  );
}
