import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import Observatory from "@/components/observatory/Observatory";
import NarratorPanel from "@/components/narrator/NarratorPanel";
import EventTimeline from "@/components/events/EventTimeline";
import SkyMap from "@/components/observatory/SkyMap";
import About from "@/components/About";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navigation />
      <main className="relative">
        <Hero />
        <Observatory />
        <NarratorPanel />
        <EventTimeline />
        <SkyMap />
        <About />
      </main>
      <Footer />
    </>
  );
}
