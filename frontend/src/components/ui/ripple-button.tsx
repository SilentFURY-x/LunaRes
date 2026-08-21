"use client";

import React, { useRef, useState } from "react";
import { cn } from "./cn";

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
  duration?: string;
}

interface Ripple {
  x: number;
  y: number;
  size: number;
  key: number;
}

export const RippleButton = React.forwardRef<HTMLButtonElement, RippleButtonProps>(
  (
    {
      className,
      children,
      rippleColor = "rgba(255, 255, 255, 0.3)",
      duration = "600ms",
      onClick,
      ...props
    },
    ref
  ) => {
    const [ripples, setRipples] = useState<Ripple[]>([]);
    const nextKey = useRef(0);

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      const key = nextKey.current++;

      setRipples((prev) => [...prev, { x, y, size, key }]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.key !== key));
      }, parseFloat(duration) || 600);

      onClick?.(e);
    }

    return (
      <button
        className={cn(
          "relative flex cursor-pointer items-center justify-center overflow-hidden bg-ctaBtn text-primaryText rounded-lg border border-divider px-4 py-2 text-center text-sm font-medium hover:opacity-80 transition-opacity",
          className
        )}
        onClick={handleClick}
        ref={ref}
        {...props}
      >
        <div className="relative z-10">{children}</div>
        {ripples.map((ripple) => (
          <span
            key={ripple.key}
            className="absolute rounded-full animate-rippling pointer-events-none"
            style={{
              width: ripple.size,
              height: ripple.size,
              top: ripple.y,
              left: ripple.x,
              backgroundColor: rippleColor,
              animationDuration: duration,
            }}
          />
        ))}
      </button>
    );
  }
);

RippleButton.displayName = "RippleButton";
