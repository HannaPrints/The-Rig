import { addresses, links } from "../config";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="" className="h-6 w-6" />
            <span className="text-sm font-bold tracking-tight">THE RIG</span>
          </div>
          <p className="mt-3 max-w-sm text-[12px] leading-5 text-muted">
            The rig has no owner. The keeper can only buy. The code is public and unaudited until it
            isn't. This is a game — not financial advice. Only spend what you are happy to lose.
          </p>
        </div>
        <div className="flex gap-12">
          <div className="space-y-2.5">
            <div className="label text-ink">trade</div>
            <a href={links.openSea} target="_blank" rel="noreferrer" className="label block hover:text-accent">
              opensea ↗
            </a>
            <a href={links.explorer} target="_blank" rel="noreferrer" className="label block hover:text-accent">
              explorer ↗
            </a>
          </div>
          <div className="space-y-2.5">
            <div className="label text-ink">follow</div>
            <a href={links.x} target="_blank" rel="noreferrer" className="label block hover:text-accent">
              x / twitter ↗
            </a>
          </div>
          <div className="space-y-2.5">
            <div className="label text-ink">build</div>
            <a href={links.github} target="_blank" rel="noreferrer" className="label block hover:text-accent">
              github ↗
            </a>
            <a href={links.docs} target="_blank" rel="noreferrer" className="label block hover:text-accent">
              docs ↗
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="num text-[11px] text-muted">
            $GPU{" "}
            <a href={`${links.explorer}/token/${addresses.gpu}`} target="_blank" rel="noreferrer" className="text-ink hover:text-accent">
              {addresses.gpu}
            </a>
          </span>
          <span className="num text-[11px] text-muted">
            CARDS{" "}
            <a href={`${links.explorer}/token/${addresses.card}`} target="_blank" rel="noreferrer" className="text-ink hover:text-accent">
              {addresses.card}
            </a>
          </span>
        </div>
        <div className="border-t border-line py-4 text-center">
          <span className="label">plug in · mine · claim</span>
        </div>
      </div>
    </footer>
  );
}
