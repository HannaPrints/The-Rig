import { useAccount, useConnect, useDisconnect } from "wagmi";
import { links } from "../config";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function Nav() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <nav className="sticky top-0 z-40 border-b border-line bg-void/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="#" className="flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-7 w-7" />
          <span className="text-[15px] font-bold tracking-tight">THE&nbsp;RIG</span>
          <span className="label mt-px hidden sm:inline">robinhood chain</span>
        </a>
        <div className="flex items-center gap-6">
          <a href="#network" className="label hidden transition-colors hover:text-accent md:block">
            network
          </a>
          <a href="#cards" className="label hidden transition-colors hover:text-accent md:block">
            cards
          </a>
          <a href="#mint" className="label hidden transition-colors hover:text-accent md:block">
            shop
          </a>
          <a href="#/docs" className="label hidden transition-colors hover:text-accent md:block">
            docs
          </a>
          <a href="#faq" className="label hidden transition-colors hover:text-accent md:block">
            faq
          </a>
          <a
            href={links.openSea}
            target="_blank"
            rel="noreferrer"
            className="label hidden transition-colors hover:text-accent sm:block"
          >
            opensea ↗
          </a>
          {isConnected && address ? (
            <button
              onClick={() => disconnect()}
              className="num border border-line px-3 py-2 text-xs text-ink transition-colors hover:border-accent-dim hover:text-accent"
              title="disconnect"
            >
              {short(address)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: connectors[0] })}
              className="num border border-accent-dim px-3 py-2 text-xs text-accent transition-colors hover:bg-accent hover:text-void"
            >
              CONNECT
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
