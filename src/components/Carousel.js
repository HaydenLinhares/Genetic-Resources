import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const images = [
  { src: "images/carousel/image1.jpg", alt: "Image 1" },
  { src: "images/carousel/image2.jpg", alt: "Image 2" },
  { src: "images/carousel/image3.jpg", alt: "Image 3" },
];

export default function Carousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % images.length), 8000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div 
      className="relative overflow-hidden rounded-2xl shadow-lg bg-red-500"
      style={{
        width: "1920px", // Explicit pixel values
        height: "480px",
      }}
    >
      {/* Debugging overlay (remove in production) */}
      <div className="absolute inset-0 border-2 border-blue-500 z-50 pointer-events-none"></div>

      <AnimatePresence mode="wait">
        <motion.div
          key={images[index].src}
          className="w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <img
            src={images[index].src}
            alt={images[index].alt}
            className="w-full h-full object-cover block" // 'block' removes inline spacing
            style={{
              maxWidth: "100%", // Ensure no overflow
              maxHeight: "100%",
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Filter overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-40 backdrop-blur-sm" />

      {/* Caption (scaled down) */}
      <div className="absolute bottom-1 left-1 text-white text-[8px] font-semibold drop-shadow-md truncate max-w-[80px]">
        {images[index].alt}
      </div>
    </div>
  );
}