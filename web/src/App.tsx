import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Ticker } from "./components/Ticker";
import { Network } from "./components/Network";
import { HowItWorks } from "./components/HowItWorks";
import { Explainer } from "./components/Explainer";
import { Catalog } from "./components/Catalog";
import { TrustStrip } from "./components/TrustStrip";
import { MintPanel } from "./components/MintPanel";
import { MyRig } from "./components/MyRig";
import { Fusion } from "./components/Fusion";
import { FAQ } from "./components/FAQ";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <Network />
        <HowItWorks />
        <Explainer />
        <TrustStrip />
        <Catalog />
        <section className="mx-auto max-w-6xl px-5 py-16" id="mint">
          <h2 className="mb-6 text-xl font-bold tracking-tight">Shop</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <MintPanel />
            <MyRig />
          </div>
          <div className="mt-4">
            <Fusion />
          </div>
        </section>
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
