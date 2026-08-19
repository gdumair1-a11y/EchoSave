import React from 'react';
import { motion } from 'framer-motion';
import { Compass } from 'lucide-react';

const Navbar = () => {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-6 backdrop-blur-md bg-black/10 border-b border-white/10"
    >
      <div className="flex items-center gap-2 group cursor-pointer">
        <Compass className="w-8 h-8 text-blue-400 group-hover:rotate-180 transition-transform duration-700" />
        <span className="text-2xl font-black tracking-tighter text-white uppercase italic">Voyager</span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/70">
        <a href="#" className="hover:text-white transition-colors">Destinations</a>
        <a href="#" className="hover:text-white transition-colors">Experiences</a>
        <a href="#" className="hover:text-white transition-colors">About</a>
        <a href="#" className="hover:text-white transition-colors">Journal</a>
      </div>

      <button className="px-6 py-2 bg-white text-black text-sm font-bold rounded-full hover:bg-blue-400 hover:text-white transition-all duration-300">
        Book Now
      </button>
    </motion.nav>
  );
};

export default Navbar;
