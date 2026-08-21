import { useState, useEffect } from "react";
import { MorphingText } from "@/components/ui/morphing-text";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { motion, AnimatePresence } from "framer-motion";

const FEATURES = [
  {
    title: "Real Paired Training Data",
    desc: "Models trained on real paired Chandrayaan-2 TMC-2 / OHRC imagery — genuine optical degradation."
  },
  {
    title: "Uncertainty Quantification",
    desc: "Every enhanced output ships with a per-pixel confidence heatmap to establish scientific trust."
  },
  {
    title: "ISRO Pipeline Integration",
    desc: "Architecture built around Bhoonidhi's actual search/fetch/order API contract."
  },
  {
    title: "Scalable by Design",
    desc: "Async job queue with horizontally-scalable inference workers and tile-parallel processing."
  }
];

export function FeatureCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % FEATURES.length);
    }, 6000); // Change every 6 seconds
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="backdrop-blur-md bg-glassBase border border-white/10 rounded-2xl p-8 h-[250px] flex flex-col justify-center">
      {/* Morphing Text handles the heading transition smoothly */}
      <MorphingText texts={FEATURES.map(f => f.title)} className="text-2xl font-bold mb-4 text-left justify-start" />
      
      {/* AnimatePresence ensures the old text unmounts before typing the new one */}
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-24"
        >
          <TypingAnimation className="text-sm font-mono text-gray-400 text-left" duration={30}>
            {FEATURES[index].desc}
          </TypingAnimation>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
