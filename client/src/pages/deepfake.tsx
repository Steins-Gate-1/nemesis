import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useDeepfakeScans, useInitiateDeepfakeScan } from "@/hooks/use-deepfake";
import { useState } from "react";
import { Fingerprint, ScanLine, Play, AlertCircle, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function Deepfake() {
  const { data: scans, isLoading } = useDeepfakeScans();
  const initiateScan = useInitiateDeepfakeScan();
  
  const [mediaUrl, setMediaUrl] = useState("");

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaUrl) return;
    initiateScan.mutate(mediaUrl, {
      onSuccess: () => setMediaUrl("")
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-primary" />
            Media Forensics
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">DEEPFAKE DETECTION & ANALYSIS MODULE</p>
        </header>

        <TacticalCard className="p-6 bg-[url('https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center bg-blend-overlay bg-black/90">
          <form onSubmit={handleScan} className="max-w-2xl mx-auto flex flex-col items-center gap-4 py-8">
            <ScanLine className="w-16 h-16 text-primary mb-2 opacity-80" />
            <h2 className="text-xl font-bold text-center">SUBMIT MEDIA FOR ANALYSIS</h2>
            <div className="w-full flex flex-col sm:flex-row gap-2">
              <input 
                type="url" 
                required
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                placeholder="Enter media URL (mp4, jpg, png)..."
                className="flex-1 bg-black/80 border-2 border-primary/50 text-foreground font-mono px-4 py-3 rounded-sm focus:outline-none focus:border-primary shadow-[0_0_15px_rgba(0,255,255,0.1)]"
              />
              <button 
                type="submit"
                disabled={initiateScan.isPending}
                className="bg-primary hover:bg-white text-black px-8 py-3 font-bold tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 uppercase disabled:opacity-50"
              >
                {initiateScan.isPending ? "PROCESSING..." : <><Play className="w-4 h-4 fill-current" /> ANALYZE</>}
              </button>
            </div>
          </form>
        </TacticalCard>

        <h3 className="text-lg font-bold border-l-4 border-primary pl-3 mt-8">RECENT SCANS</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center text-primary/50 py-10 font-mono">LOADING ARCHIVES...</div>
          ) : scans?.length === 0 ? (
            <div className="col-span-full text-center text-primary/50 py-10 font-mono">NO SCANS RECORDED</div>
          ) : scans?.map(scan => (
            <TacticalCard key={scan.id} className="p-0 overflow-hidden flex flex-col">
              {/* Media placeholder/preview */}
              <div className="h-32 bg-black/60 relative border-b border-primary/20 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground font-mono break-all px-4 text-center line-clamp-2">
                  {scan.mediaUrl}
                </span>
                <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent pointer-events-none" />
              </div>
              
              <div className="p-4 flex-1 flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs text-muted-foreground font-mono">
                    {scan.createdAt ? format(new Date(scan.createdAt), 'yyyy-MM-dd HH:mm') : ''}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${
                    scan.status === 'pending' ? 'border-warning text-warning' : 'border-primary/30 text-primary'
                  }`}>
                    {scan.status}
                  </span>
                </div>

                {scan.status === 'completed' && scan.isDeepfake !== null && (
                  <div className={`mt-auto p-3 rounded-sm border ${scan.isDeepfake ? 'bg-destructive/10 border-destructive' : 'bg-primary/5 border-primary/30'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold flex items-center gap-2">
                        {scan.isDeepfake ? <AlertCircle className="w-4 h-4 text-destructive" /> : <CheckCircle className="w-4 h-4 text-primary" />}
                        {scan.isDeepfake ? 'SYNTHETIC MEDIA' : 'AUTHENTIC'}
                      </span>
                      <span className={`text-lg font-mono ${scan.isDeepfake ? 'text-destructive' : 'text-primary'}`}>
                        {scan.confidenceScore}%
                      </span>
                    </div>
                    <div className="w-full bg-black h-1 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${scan.isDeepfake ? 'bg-destructive' : 'bg-primary'}`} 
                        style={{ width: `${scan.confidenceScore}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {scan.status === 'pending' && (
                  <div className="mt-auto p-3 bg-black/50 border border-dashed border-primary/30 flex items-center justify-center h-[72px]">
                    <span className="text-primary/70 text-xs font-mono animate-pulse">ANALYZING PIXELS...</span>
                  </div>
                )}
              </div>
            </TacticalCard>
          ))}
        </div>
      </div>
    </Layout>
  );
}
