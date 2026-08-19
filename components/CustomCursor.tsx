import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

const CustomCursor = () => {
  const [isHovering, setIsHovering] = useState(false);
  const cursorX = useSpring(0, { damping: 20, stiffness: 200, restDelta: 0.001 });
  const cursorY = useSpring(0, { damping: 20, stiffness: 200, restDelta: 0.001 });

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const handleHover = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, .group')) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleHover);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleHover);
    };
  }, []);

  return (
    <motion.div
      style={{
        translateX: cursorX,
        translateY: cursorY,
        left: -16,
        top: -16,
      }}
      className={`fixed pointer-events-none z-[9999] rounded-full border border-blue-400 mix-blend-difference transition-all duration-300 ${
        isHovering ? 'w-16 h-16 bg-blue-400/20' : 'w-8 h-8'
      }`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-1 h-1 bg-white rounded-full" />
      </div>
    </motion.div>
  );
};

export default CustomCursor;
