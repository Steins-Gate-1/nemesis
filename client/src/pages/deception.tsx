import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useDeceptionAssets, useCreateDeceptionAsset } from "@/hooks/use-deception";
import { useState } from "react";
import { Eye, Plus, Shield, CheckCircle2, AlertTriangle, AlertOctagon } from "lucide-react";
import { format } from "date-fns";

export default function Deception() {
  const { data: assets, isLoading } = useDeceptionAssets();
  const createAsset = useCreateDeceptionAsset();
  
  const [isDeploying, setIsDeploying] = useState(false);
  const [newAsset, setNewAsset] = useState({ assetType: "Canarytoken", url: "" });

  const handleDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAsset.url) return;
    createAsset.mutate(newAsset, {
      onSuccess: () => {
        setIsDeploying(false);
        setNewAsset({ assetType: "Canarytoken", url: "" });
      }
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex justify-between items-end border-b border-primary/20 pb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Eye className="w-8 h-8 text-primary" />
              Deception Grid
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">HONEYPOTS & CANARY TOKENS MANAGEMENT</p>
          </div>
          <button 
            onClick={() => setIsDeploying(true)}
            className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-4 py-2 font-bold tracking-widest rounded-sm transition-all flex items-center gap-2 uppercase text-sm"
          >
            <Plus className="w-4 h-4" />
            Deploy Asset
          </button>
        </header>

        {isDeploying && (
          <TacticalCard className="p-6 border-primary bg-primary/5">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              INITIALIZE NEW DECEPTION ASSET
            </h3>
            <form onSubmit={handleDeploy} className="flex flex-col md:flex-row gap-4">
              <select 
                value={newAsset.assetType}
                onChange={(e) => setNewAsset({...newAsset, assetType: e.target.value})}
                className="bg-black/50 border border-primary/30 text-primary font-mono text-sm px-4 py-2 rounded-sm focus:outline-none focus:border-primary"
              >
                <option value="Canarytoken">Canarytoken (URL)</option>
                <option value="Honey Document">Honey Document</option>
                <option value="Fake Credential">Fake Credential</option>
              </select>
              <input 
                type="text" 
                required
                value={newAsset.url}
                onChange={(e) => setNewAsset({...newAsset, url: e.target.value})}
                placeholder="Target URL or Path..."
                className="flex-1 bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-2 rounded-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
              />
              <div className="flex gap-2">
                <button 
                  type="submit"
                  disabled={createAsset.isPending}
                  className="bg-primary text-black px-6 py-2 font-bold tracking-widest rounded-sm transition-all uppercase text-sm disabled:opacity-50"
                >
                  {createAsset.isPending ? "Deploying..." : "Execute"}
                </button>
                <button 
                  type="button"
                  onClick={() => setIsDeploying(false)}
                  className="bg-transparent border border-muted-foreground text-muted-foreground px-4 py-2 font-bold tracking-widest rounded-sm transition-all uppercase text-sm hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </TacticalCard>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full text-center text-primary/50 py-10 font-mono">SCANNING DECEPTION GRID...</div>
          ) : assets?.length === 0 ? (
            <div className="col-span-full text-center text-primary/50 py-10 font-mono">NO ASSETS DEPLOYED</div>
          ) : assets?.map(asset => (
            <TacticalCard key={asset.id} variant={asset.triggered ? "danger" : "default"} className="p-5 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-black/50 border border-primary/20 px-2 py-1 rounded-sm text-xs font-mono text-primary">
                  {asset.assetType}
                </div>
                {asset.triggered ? (
                  <span className="flex items-center gap-1 text-destructive text-xs font-bold animate-pulse">
                    <AlertOctagon className="w-4 h-4" /> COMPROMISED
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-primary/50 text-xs font-mono">
                    <CheckCircle2 className="w-4 h-4" /> STANDBY
                  </span>
                )}
              </div>
              
              <div className="mb-4 flex-1">
                <p className="text-xs text-muted-foreground mb-1 font-mono">PAYLOAD LOCATION</p>
                <p className="text-sm font-mono truncate text-foreground" title={asset.url}>{asset.url}</p>
              </div>

              <div className="border-t border-primary/10 pt-3 flex justify-between items-center text-xs font-mono">
                <span className="text-muted-foreground">DEPLOYED: {asset.createdAt ? format(new Date(asset.createdAt), 'MM/dd HH:mm') : 'N/A'}</span>
                {asset.lastTriggeredAt && (
                  <span className="text-destructive">TRIGGERED: {format(new Date(asset.lastTriggeredAt), 'HH:mm:ss')}</span>
                )}
              </div>
            </TacticalCard>
          ))}
        </div>
      </div>
    </Layout>
  );
}
