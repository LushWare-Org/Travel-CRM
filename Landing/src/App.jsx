import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Portals from './components/Portals';
import HowItWorks from './components/HowItWorks';
import CtaBanner from './components/CtaBanner';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Portals />
        <HowItWorks />
        <CtaBanner />
      </main>
      <Footer />
    </div>
  );
}
