import { Lens } from "@/components/ui/lens";

export function HeroLensDemo() {
  return (
    <div className="relative w-full max-w-lg mx-auto aspect-square rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
      <Lens 
        zoomFactor={2} 
        lensSize={200} 
        isStatic={false}
      >
        {/* Base Image (Low Resolution) */}
        <img 
          src="/assets/demo-lunar-lowres.jpg" 
          alt="Lunar Surface Low Resolution" 
          className="w-full h-full object-cover"
        />
        
        {/* Note: The Lens component from MagicUI usually zooms the existing image. 
            To show a DIFFERENT image inside the lens (the High-Res version), 
            we will modify the Lens component slightly to accept a 'zoomImageSrc' prop. */}
      </Lens>
      <div className="absolute bottom-4 left-4 backdrop-blur-md bg-background/50 px-4 py-2 rounded-full text-xs font-mono border border-white/10">
        Hover to enhance
      </div>
    </div>
  );
}
