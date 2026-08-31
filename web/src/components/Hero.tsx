import { useReadContract } from "wagmi";
import { addresses, deployed } from "../config";
import { shopAbi } from "../abi";

export function Hero() {
  const { data: made } = useReadContract({
    address: addresses.shop,
    abi: shopAbi,
    functionName: "madeCount",
    query: { enabled: deployed },
  });

  return (
    <header className="flex flex-col items-center py-20 text-center">
      <pre aria-hidden className="mb-8 hidden text-[10px] leading-tight text-phosphor-dim sm:block">{String.raw`
 ▄▄▄▄▄▄▄ ▄▄   ▄▄ ▄▄▄▄▄▄▄    ▄▄▄▄▄▄   ▄▄▄ ▄▄▄▄▄▄▄
 █       █  █ █  █       █  █   ▄  █ █   █       █
 █▄     ▄█  █▄█  █    ▄▄▄█  █  █ █ █ █   █   ▄▄▄▄█
   █   █ █       █   █▄▄▄   █   █▄▄█▄█   █  █  ▄▄
   █   █ █   ▄   █    ▄▄▄█  █    ▄▄  █   █  █ █  █
   █   █ █  █ █  █   █▄▄▄   █   █  █ █   █  █▄▄█ █
   █▄▄▄█ █▄▄█ █▄▄█▄▄▄▄▄▄▄█  █▄▄▄█  █▄█▄▄▄█▄▄▄▄▄▄▄█`}</pre>

      <h1 className="glow text-4xl font-bold tracking-[0.2em] text-phosphor sm:hidden">THE RIG</h1>

      <p className="cursor mt-6 max-w-2xl text-sm leading-7 text-ink">
        A mining game on <span className="text-amber">Robinhood Chain</span>. Mint a graphics card
        for <span className="glow text-phosphor">$5</span>, slot it into your rig, and it earns{" "}
        <span className="glow text-phosphor">$GPU</span> for as long as it is plugged in.
      </p>

      <div className="mt-10 flex items-center gap-6">
        <a
          href="#mint"
          className="glow border-2 border-phosphor px-8 py-3 text-sm font-bold tracking-widest text-phosphor transition hover:bg-phosphor hover:text-void"
        >
          PLUG IN ▸
        </a>
        <div className="text-left text-xs text-ink">
          <div className="text-phosphor">{(made ?? 0n).toString()} / 10,000</div>
          <div className="text-phosphor-dim">cards made</div>
        </div>
      </div>

      <p className="mt-8 text-[11px] tracking-widest text-phosphor-dim">
        $GPU IS NEVER MINTED — ONLY BOUGHT
      </p>
    </header>
  );
}
