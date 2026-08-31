import { useEffect, useState } from "react";
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
import { Docs } from "./components/Docs";
import { Footer } from "./components/Footer";

function useRoute() {
  const [route, setRoute] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setRoute(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export default function App() {
  const route = useRoute();
  const onDocs = route.startsWith("#/docs");

  // scroll to the docs anchor when navigating to #/docs#section
  useEffect(() => {
    if (onDocs) {
      const id = route.split("#")[2];
      const el = id ? document.getElementById(id) : null;
      (el ?? document.getElementById("root"))?.scrollIntoView({ behavior: id ? "smooth" : "auto" });
    }
  }, [route, onDocs]);

  return (
    <div className="min-h-screen">
      <Nav />
      {onDocs ? (
        <Docs />
      ) : (
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
      )}
      <Footer />
    </div>
  );
}
