import { motion, AnimatePresence } from "framer-motion";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useEffect, useState } from "react";

export function GlobalLoader({ isLoaded }: { isLoaded: boolean }) {
  return (
    <AnimatePresence>
      {!isLoaded && (
        <motion.div
          initial={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-primaryText"
        >
          {/* Minimalist Line Art or Logo can go here */}
          <div className="text-4xl font-light tracking-widest flex items-center gap-2">
            LUNA.RES <NumberTicker value={100} className="text-primaryText" />%
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
