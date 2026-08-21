"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "./cn";

interface LensProps {
  children: React.ReactNode;
  zoomFactor?: number;
  lensSize?: number;
  isStatic?: boolean;
  position?: { x: number; y: number };
  hovering?: boolean;
  setHovering?: (hovering: boolean) => void;
}

export function Lens({
  children,
  zoomFactor = 1.5,
  lensSize = 170,
  isStatic = false,
  position = { x: 200, y: 150 },
  hovering: externalHovering,
  setHovering: externalSetHovering,
}: LensProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localHovering, setLocalHovering] = useState(false);
  const [localMouse, setLocalMouse] = useState({ x: 0, y: 0 });

  const isHovering = externalHovering !== undefined ? externalHovering : localHovering;
  const setIsHovering = externalSetHovering || setLocalHovering;
  const mousePos = isStatic ? position : localMouse;

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLocalMouse({ x, y });
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      onMouseMove={handleMouseMove}
    >
      {children}

      <AnimatePresence>
        {isHovering && (
          <motion.div
            initial={{ opacity: 0, scale: 0.58 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute pointer-events-none z-50 border-2 border-divider bg-transparent shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
            style={{
              width: lensSize,
              height: lensSize,
              borderRadius: "50%",
              top: mousePos.y - lensSize / 2,
              left: mousePos.x - lensSize / 2,
              overflow: "hidden",
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                transform: `scale(${zoomFactor})`,
                transformOrigin: "center",
                backgroundImage: `var(--lens-bg)`,
                backgroundSize: "var(--lens-bg-size, 100%)",
                backgroundPosition: `${-mousePos.x * zoomFactor + lensSize / 2}px ${-mousePos.y * zoomFactor + lensSize / 2}px`,
              }}
            >
              {/* Cloned children at zoom */}
              <div
                style={{
                  position: "absolute",
                  top: -mousePos.y * zoomFactor + lensSize / 2,
                  left: -mousePos.x * zoomFactor + lensSize / 2,
                  width: containerRef.current?.offsetWidth,
                  height: containerRef.current?.offsetHeight,
                  transform: `scale(${zoomFactor})`,
                  transformOrigin: "0 0",
                }}
              >
                {children}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
