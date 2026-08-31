import { useAccount, useConnect, useDisconnect } from "wagmi";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function Nav() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <nav className="sticky top-0 z-40 border-b border-grid bg-void/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <a href="#" className="flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-8 w-8" />
          <span className="glow text-lg font-bold tracking-[0.3em] text-phosphor">THE RIG</span>
        </a>
        <div className="flex items-center gap-4 text-xs">
          <a href="#network" className="hidden text-ink hover:text-phosphor sm:block">
            NETWORK
          </a>
          <a href="#cards" className="hidden text-ink hover:text-phosphor sm:block">
            CARDS
          </a>
          <a href="#mint" className="hidden text-ink hover:text-phosphor sm:block">
            SHOP
          </a>
          {isConnected && address ? (
            <button
              onClick={() => disconnect()}
              className="border border-phosphor-dim px-3 py-1.5 text-phosphor hover:bg-phosphor hover:text-void"
              title="disconnect"
            >
              {short(address)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="border border-phosphor px-3 py-1.5 text-phosphor hover:bg-phosphor hover:text-void"
            >
              CONNECT
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
