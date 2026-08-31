import { useState } from "react";
import { useReadContract } from "wagmi";
import { addresses, deployed, links } from "../config";
import { shopAbi, rigAbi } from "../abi";
import { RigMonitor } from "./RigMonitor";

function CaChip() {
  const [copied, setCopied] = useState(false);
  const ca = addresses.gpu;
  return (
    <div className="mt-8 inline-flex max-w-full items-center gap-3 border border-line bg-panel px-3.5 py-2.5">
      <span className="label shrink-0 text-accent">$gpu ca</span>
      <a
        href={`${links.explorer}/token/${ca}`}
        target="_blank"
        rel="noreferrer"
        className="num min-w-0 truncate text-[12px] text-ink transition-colors hover:text-accent"
        title={ca}
      >
        {ca}
      </a>
      <button
        onClick={() => {
          navigator.clipboard.writeText(ca);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="label shrink-0 cursor-pointer transition-colors hover:text-accent"
      >
        {copied ? "copied ✓" : "copy"}
      </button>
    </div>
  );
}

export function Hero() {
  const { data: made } = useReadContract({
    address: addresses.shop,
    abi: shopAbi,
    functionName: "madeCount",
    query: { enabled: deployed },
  });
  const { data: weight } = useReadContract({
    address: addresses.rig,
    abi: rigAbi,
    functionName: "totalWeight",
    query: { enabled: deployed },
  });

  return (
    <header className="blueprint">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 md:grid-cols-[1.05fr_0.95fr] md:pt-24">
        <div>
          <p className="label mb-6">10,000 graphics cards · $5 each</p>
          <h1 className="text-[42px] font-bold leading-[1.04] tracking-tight sm:text-[56px]">
            A graphics card
            <br />
            that <span className="text-accent">pays its own</span>
            <br />
            power bill.
          </h1>
          <p className="mt-6 max-w-md text-[15px] leading-7 text-muted">
            Mint a card, slot it into your rig, and it earns <span className="text-ink">$GPU</span> for
            as long as it's plugged in — streamed every second, pro-rata by hashrate, funded by
            open-market buybacks. <span className="text-ink">$GPU is never minted. Only bought.</span>
          </p>
          <CaChip />
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a href="#mint" className="btn-primary">
              MINT — $5
            </a>
            <a
              href="https://github.com/HannaPrints/The-Rig/blob/main/docs/DEEPDIVE.md"
              target="_blank"
              rel="noreferrer"
              className="btn-ghost"
            >
              READ THE DOCS
            </a>
          </div>
          <div className="mt-12 flex gap-10">
            <div>
              <div className="num text-xl text-ink">{(made ?? 0n).toLocaleString()}</div>
              <div className="label mt-1">cards made</div>
            </div>
            <div>
              <div className="num text-xl text-ink">{(weight ?? 0n).toLocaleString()}</div>
              <div className="label mt-1">network mh/s</div>
            </div>
            <div>
              <div className="num text-xl text-ink">12h</div>
              <div className="label mt-1">stream windows</div>
            </div>
          </div>
        </div>
        <RigMonitor />
      </div>
    </header>
  );
}
