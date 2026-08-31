import { useReadContract } from "wagmi";
import { addresses, deployed } from "../config";
import { shopAbi, rigAbi } from "../abi";
import { RigMonitor } from "./RigMonitor";

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
          <div className="mt-9 flex flex-wrap items-center gap-4">
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
