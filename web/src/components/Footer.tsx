export function Footer() {
  return (
    <footer className="mt-12 border-t border-grid">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 text-center">
        <div className="text-[11px] tracking-[0.3em] text-phosphor-dim">
          PLUG IN · MINE · CLAIM
        </div>
        <div className="flex justify-center gap-6 text-xs">
          <a href="https://github.com/HannaPrints/The-Rig" className="text-ink hover:text-phosphor">
            github
          </a>
          <a
            href="https://github.com/HannaPrints/The-Rig/blob/main/docs/DEEPDIVE.md"
            className="text-ink hover:text-phosphor"
          >
            docs
          </a>
          <a href="https://robinhoodchain.blockscout.com" className="text-ink hover:text-phosphor">
            explorer
          </a>
        </div>
        <p className="mx-auto max-w-xl text-[11px] leading-5 text-phosphor-dim">
          the rig has no owner. the keeper can only buy. the code is public and unaudited until it
          isn't. this is a game — not financial advice. only spend what you are happy to lose.
        </p>
      </div>
    </footer>
  );
}
