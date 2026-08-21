import { NumberTicker } from "@/components/ui/number-ticker";
import { PulsatingButton } from "@/components/ui/pulsating-button";
import { AnimatedBeamDemo } from "./JobDataFlowBeam";

export function ActiveJobCard({ progress, onCancel }: { progress: number, onCancel: () => void }) {
  return (
    <div className="p-6 backdrop-blur-md bg-glassBase border border-white/10 rounded-2xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-medium">Reconstructing Scene...</h3>
          <p className="text-sm text-gray-400 font-mono">
            Progress: <NumberTicker value={progress} />%
          </p>
        </div>
        
        {/* Pulsating button used for a prominent Cancel action while processing */}
        <PulsatingButton onClick={onCancel} className="bg-red-500/20 text-red-500 hover:bg-red-500/40">
          Abort Job
        </PulsatingButton>
      </div>
      
      {/* Visual representation of the pipeline */}
      <div className="h-48 w-full bg-background/50 rounded-xl flex items-center justify-center p-4">
         <AnimatedBeamDemo />
      </div>
    </div>
  );
}
