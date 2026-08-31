import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import { addresses, deployed } from "../config";
import { rigAbi, cardAbi } from "../abi";

function Row({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-line/60 py-2.5 last:border-0">
      <span className="label">{label}</span>
      <span className="num text-sm text-ink">
        {value}
        {unit && <span className="ml-1 text-muted">{unit}</span>}
      </span>
    </div>
  );
}

/** The GPU itself: shroud, two spinning fans, power connector, PCIe fingers. */
function CardArt() {
  return (
    <svg viewBox="0 0 320 132" className="w-full" aria-hidden>
      <rect x="6" y="14" width="296" height="88" rx="6" fill="#151c22" stroke="#2a3842" strokeWidth="1.5" />
      <rect x="6" y="14" width="296" height="16" rx="6" fill="#1a232b" />
      <text x="20" y="26" fontFamily="IBM Plex Mono, monospace" fontSize="9" fill="#7d8c85" letterSpacing="2">
        THE RIG · UNIT 01
      </text>
      <rect x="270" y="18" width="20" height="8" fill="#f0a850" opacity="0.9" />
      {[86, 210].map((cx, i) => (
        <g key={cx}>
          <circle cx={cx} cy="66" r="27" fill="#0c1116" stroke="#2a3842" strokeWidth="1.5" />
          <g className={`fan${i === 1 ? " slow" : ""}`} style={{ transformBox: "fill-box" }}>
            {[0, 60, 120, 180, 240, 300].map((r) => (
              <path
                key={r}
                d={`M ${cx} 66 L ${cx + 20} 60 A 22 22 0 0 1 ${cx + 17} 76 Z`}
                fill="#243039"
                transform={`rotate(${r} ${cx} 66)`}
              />
            ))}
            <circle cx={cx} cy="66" r="6" fill="#2a3842" />
            <circle cx={cx} cy="66" r="2" fill="#3ce97e" />
          </g>
        </g>
      ))}
      <rect x="148" y="52" width="4" height="28" fill="#1a232b" />
      <rect x="20" y="102" width="170" height="9" fill="#f0a850" opacity="0.85" />
      <rect x="198" y="102" width="44" height="9" fill="#f0a850" opacity="0.85" />
    </svg>
  );
}

export function RigMonitor() {
  const q = { query: { enabled: deployed, refetchInterval: 20_000 } };
  const { data: weight } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "totalWeight", ...q });
  const { data: rate } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "rewardRate", ...q });
  const { data: living } = useReadContract({ address: addresses.card, abi: cardAbi, functionName: "livingCount", ...q });
  const { data: paid } = useReadContract({ address: addresses.rig, abi: rigAbi, functionName: "totalPaidOut", ...q });

  const fmt = (v: bigint | undefined, dec = 0) =>
    !deployed || v === undefined
      ? "——"
      : Number(dec ? formatUnits(v, dec) : v).toLocaleString("en-US", { maximumFractionDigits: 2 });

  return (
    <div className="panel select-none">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="label text-ink">rig-01</span>
        <span className="flex items-center gap-2">
          <span className={`status-dot ${deployed ? "bg-accent" : "bg-amber"}`} />
          <span className="label">{deployed ? "live" : "standby"}</span>
        </span>
      </div>
      <div className="crt px-5 py-6">
        <CardArt />
        <div className="mt-4">
          <Row label="network power" value={fmt(weight)} unit="MH/s" />
          <Row label="stream rate" value={fmt(rate, 18)} unit="$GPU/s" />
          <Row label="cards live" value={fmt(living)} />
          <Row label="paid to miners" value={fmt(paid, 18)} unit="$GPU" />
        </div>
      </div>
      <div className="border-t border-line px-4 py-2.5">
        <span className="label">{deployed ? "robinhood chain · 4663" : "awaiting mainnet — nothing minted yet"}</span>
      </div>
    </div>
  );
}
