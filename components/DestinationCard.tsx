import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface DestinationCardProps {
  title: string;
  location: string;
  image: string;
  price: string;
}

const DestinationCard: React.FC<DestinationCardProps> = ({ title, location, image, price }) => {
  const ref = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-10deg", "10deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!ref.current) return;

    const rect = ref.current.getBoundingClientRect();

    const width = rect.width;
    const height = rect.height;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;

    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateY,
        rotateX,
        transformStyle: "preserve-3d",
      }}
      className="relative h-96 w-full rounded-2xl bg-slate-900 group cursor-pointer"
    >
      <div
        style={{
          transform: "translateZ(75px)",
          transformStyle: "preserve-3d",
        }}
        className="absolute inset-4 grid place-content-end rounded-xl bg-slate-800 shadow-2xl overflow-hidden"
      >
        <img
          src={image}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        <div
           style={{
             transform: "translateZ(50px)",
           }}
           className="relative p-6 text-white"
        >
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">{location}</p>
          <h3 className="text-2xl font-black mb-2">{title}</h3>
          <div className="flex justify-between items-center mt-4">
            <span className="text-lg font-bold">{price}</span>
            <button className="px-4 py-2 bg-white/20 backdrop-blur-md rounded-lg text-xs font-bold hover:bg-white hover:text-black transition-all">
              Details
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DestinationCard;
