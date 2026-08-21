"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "./cn";

interface MorphingTextProps {
  texts: string[];
  className?: string;
  morphTime?: number;
  cooldownTime?: number;
}

export function MorphingText({
  texts,
  className,
  morphTime = 1.5,
  cooldownTime = 0.5,
}: MorphingTextProps) {
  const textIndexRef = useRef(0);
  const morphRef = useRef(0);
  const cooldownRef = useRef(0);
  const timeRef = useRef(Date.now());
  const text1Ref = useRef<HTMLSpanElement>(null);
  const text2Ref = useRef<HTMLSpanElement>(null);
  const rafRef = useRef<number>(0);

  const setStyles = useCallback(
    (fraction: number) => {
      const el1 = text1Ref.current;
      const el2 = text2Ref.current;
      if (!el1 || !el2) return;
      el2.style.filter = `blur(${Math.min(8 / fraction - 8, 100)}px)`;
      el2.style.opacity = `${Math.pow(fraction, 0.4) * 100}%`;
      const inverseFraction = 1 - fraction;
      el1.style.filter = `blur(${Math.min(8 / inverseFraction - 8, 100)}px)`;
      el1.style.opacity = `${Math.pow(inverseFraction, 0.4) * 100}%`;
    },
    [],
  );

  const doMorph = useCallback(
    (dt: number) => {
      morphRef.current -= cooldownRef.current;
      cooldownRef.current = 0;
      let fraction = morphRef.current / morphTime;
      if (fraction > 1) {
        cooldownRef.current = cooldownTime;
        fraction = 1;
      }
      setStyles(fraction);
      if (fraction === 1) {
        textIndexRef.current = (textIndexRef.current + 1) % texts.length;
      }
    },
    [morphTime, cooldownTime, setStyles, texts.length],
  );

  const doCooldown = useCallback(
    (dt: number) => {
      morphRef.current = 0;
      const el1 = text1Ref.current;
      const el2 = text2Ref.current;
      if (el1 && el2) {
        el2.style.filter = "";
        el2.style.opacity = "100%";
        el1.style.filter = "";
        el1.style.opacity = "0%";
      }
    },
    [],
  );

  const animate = useCallback(() => {
    rafRef.current = requestAnimationFrame(animate);
    const newTime = Date.now();
    const dt = (newTime - timeRef.current) / 1000;
    timeRef.current = newTime;
    cooldownRef.current -= dt;

    const el1 = text1Ref.current;
    const el2 = text2Ref.current;
    if (!el1 || !el2) return;

    el1.textContent = texts[textIndexRef.current % texts.length];
    el2.textContent = texts[(textIndexRef.current + 1) % texts.length];

    if (cooldownRef.current <= 0) {
      morphRef.current += dt;
      doMorph(dt);
    } else {
      doCooldown(dt);
    }
  }, [doMorph, doCooldown, texts]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [animate]);

  return (
    <div className={cn("relative inline-block", className)}>
      <span
        className="absolute left-0 top-0 w-full"
        ref={text1Ref}
        aria-hidden
      />
      <span
        className="absolute left-0 top-0 w-full"
        ref={text2Ref}
        aria-hidden
      />
      {/* Invisible spacer for layout */}
      <span className="invisible">
        {texts.reduce((a, b) => (a.length > b.length ? a : b), "")}
      </span>
    </div>
  );
}
