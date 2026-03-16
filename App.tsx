import React, { useEffect } from 'react';
import { motion, useScroll, useSpring } from 'framer-motion';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import DestinationCard from './components/DestinationCard';
import CustomCursor from './components/CustomCursor';
import Footer from './components/Footer';

const destinations = [
  {
    title: "The Dolomites",
    location: "Italy",
    price: "$4,500",
    image: "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1974&auto=format&fit=crop"
  },
  {
    title: "Kyoto Gardens",
    location: "Japan",
    price: "$5,200",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop"
  },
  {
    title: "Santorini Blue",
    location: "Greece",
    price: "$3,800",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=2021&auto=format&fit=crop"
  },
  {
    title: "Patagonia Peaks",
    location: "Chile",
    price: "$6,100",
    image: "https://images.unsplash.com/photo-1517059224940-d4af9eec41b7?q=80&w=1905&auto=format&fit=crop"
  },
  {
    title: "Sahara Sands",
    location: "Morocco",
    price: "$2,900",
    image: "https://images.unsplash.com/photo-1509062148168-800c25867c9c?q=80&w=2070&auto=format&fit=crop"
  },
  {
    title: "Icelandic Fire",
    location: "Iceland",
    price: "$4,200",
    image: "https://images.unsplash.com/photo-1476610182048-b716b8518aae?q=80&w=2059&auto=format&fit=crop"
  }
];

function App() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Smooth scroll behavior
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="bg-black min-h-screen text-white selection:bg-blue-400 selection:text-black">
      <CustomCursor />
      
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-blue-400 origin-left z-[100]"
        style={{ scaleX }}
      />

      <Navbar />
      
      <main>
        <Hero />

        <section className="py-32 px-8 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
            <div>
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter"
              >
                Curated <br /> <span className="text-blue-400">Escapes</span>
              </motion.h2>
            </div>
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="text-white/40 max-w-sm text-lg leading-relaxed"
            >
              Our selection of exclusive destinations is meticulously vetted to ensure an unparalleled experience for the discerning traveler.
            </motion.p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {destinations.map((dest, index) => (
              <motion.div
                key={dest.title}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <DestinationCard {...dest} />
              </motion.div>
            ))}
          </div>
        </section>

        <section className="py-32 bg-zinc-900 overflow-hidden">
          <div className="max-w-7xl mx-auto px-8">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="absolute -top-20 -left-20 w-64 h-64 bg-blue-600/20 blur-[120px] rounded-full"
              />

              <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
                <div>
                  <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">THE ART OF <br /> EXPLORATION</h2>
                  <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                    We don't just book trips. We design moments that linger. From private access to historical wonders to culinary journeys in hidden villages, your story begins here.
                  </p>
                  <button className="px-10 py-5 bg-white text-black font-black uppercase tracking-widest text-sm rounded-full hover:bg-blue-400 hover:text-white transition-all">
                    Learn Our Philosophy
                  </button>
                </div>
                <div className="relative h-[600px] rounded-2xl overflow-hidden group">
                   <img
                    src="https://images.unsplash.com/photo-1551632432-c73581c61976?q=80&w=2070&auto=format&fit=crop"
                    alt="Experience"
                    className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                   />
                   <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay group-hover:bg-transparent transition-all" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-40 text-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-8xl font-black italic mb-12"
          >
            READY TO <span className="text-blue-400">VANISH?</span>
          </motion.h2>
          <button className="px-12 py-6 border-2 border-white text-xl font-bold rounded-full hover:bg-white hover:text-black transition-all">
            Contact A Specialist
          </button>
        </section>
      </main>

      <Footer />
    </div>
  );
}

export default App;
