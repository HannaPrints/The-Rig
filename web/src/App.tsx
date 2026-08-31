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
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-16 md:grid-cols-2" id="mint">
          <MintPanel />
          <MyRig />
        </div>
        <FAQ />
      </main>
      <Footer />
    </div>
  );
}
