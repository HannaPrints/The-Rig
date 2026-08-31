import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Ticker } from "./components/Ticker";
import { Network } from "./components/Network";
import { Catalog } from "./components/Catalog";
import { HowItWorks } from "./components/HowItWorks";
import { MintPanel } from "./components/MintPanel";
import { MyRig } from "./components/MyRig";
import { Footer } from "./components/Footer";

export default function App() {
  return (
    <div className="scanlines rackgrid min-h-screen">
      <Nav />
      <main className="mx-auto max-w-5xl px-4">
        <Hero />
        <Ticker />
        <Network />
        <HowItWorks />
        <Catalog />
        <div className="grid gap-6 py-12 md:grid-cols-2" id="mint">
          <MintPanel />
          <MyRig />
        </div>
      </main>
      <Footer />
    </div>
  );
}
