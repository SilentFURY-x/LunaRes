import { useRef } from "react";
import { AnimatedBeam, CircleNode } from "@/components/ui/animated-beam";
import { Monitor, Server, Cpu } from "lucide-react";

/**
 * AnimatedBeamDemo — visual representation of the data processing pipeline.
 * Shows: Client → Backend Queue → GPU Worker
 */
export function AnimatedBeamDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);
  const serverRef = useRef<HTMLDivElement>(null);
  const gpuRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative flex w-full items-center justify-between px-8"
      ref={containerRef}
    >
      <CircleNode ref={clientRef}>
        <Monitor className="h-5 w-5 text-primaryText" />
      </CircleNode>

      <CircleNode ref={serverRef}>
        <Server className="h-5 w-5 text-primaryText" />
      </CircleNode>

      <CircleNode ref={gpuRef}>
        <Cpu className="h-5 w-5 text-primaryText" />
      </CircleNode>

      {containerRef.current && clientRef.current && serverRef.current && gpuRef.current && (
        <>
          <AnimatedBeam
            containerRef={containerRef as React.RefObject<HTMLElement>}
            fromRef={clientRef as React.RefObject<HTMLElement>}
            toRef={serverRef as React.RefObject<HTMLElement>}
            duration={3}
          />
          <AnimatedBeam
            containerRef={containerRef as React.RefObject<HTMLElement>}
            fromRef={serverRef as React.RefObject<HTMLElement>}
            toRef={gpuRef as React.RefObject<HTMLElement>}
            duration={3}
            delay={0.5}
          />
        </>
      )}

      {/* Labels below nodes */}
      <div className="absolute -bottom-6 left-0 w-full flex justify-between px-8">
        <span className="text-[10px] text-secondaryText font-mono">Client</span>
        <span className="text-[10px] text-secondaryText font-mono">Queue</span>
        <span className="text-[10px] text-secondaryText font-mono">GPU</span>
      </div>
    </div>
  );
}
