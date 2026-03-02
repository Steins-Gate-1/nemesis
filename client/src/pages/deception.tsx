import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import {
  useDeceptionAssets, useDeceptionStats, useCorrelation,
  useDeployHoneytoken, useDeleteDeceptionAsset, useSimulateTrigger,
  useHoneyPersonas, useCreateHoneyPersona, useRetirePersona,
} from "@/hooks/use-deception";
import { useState } from "react";
import { format } from "date-fns";
import {
  Eye, Plus, Shield, CheckCircle2, AlertOctagon, AlertTriangle,
  Key, Link, FileText, File, Globe, Mail, Crosshair, UserPlus,
  Users, Trash2, Zap, Activity, Network, X, MapPin
} from "lucide-react";

const TOKEN_TYPES = [
  { id: "aws_key", label: "AWS API Key", icon: Key },
  { id: "url_token", label: "Generic URL Token", icon: Link },
  { id: "ms_word", label: "MS Word Document", icon: FileText },
  { id: "pdf", label: "PDF Document", icon: File },
  { id: "dns_token", label: "DNS Token", icon: Globe },
  { id: "smtp_token", label: "SMTP Token", icon: Mail },
];

const PLACEMENTS = [
  "Private Git Repository",
  "Cloud Config File (S3/GCS)",
  "Internal Shared Drive",
  "Employee Onboarding Documents",
  "CI/CD Pipeline Config",
  "Internal Wiki / Confluence",
  "Fake Credential Store",
  "Partner API Documentation",
];

function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    MODERATE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    NOMINAL: "bg-green-500/20 text-green-400 border-green-500/40",
    LOW: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase font-mono border rounded-sm ${colors[level] || colors.NOMINAL}`}>
      {level}
    </span>
  );
}

function TokenIcon({ type }: { type: string }) {
  const found = TOKEN_TYPES.find(t => t.id === type);
  if (!found) return <Shield className="w-4 h-4 text-primary" />;
  const Icon = found.icon;
  return <Icon className="w-4 h-4 text-primary" />;
}

export default function Deception() {
  const [activeTab, setActiveTab] = useState<"grid" | "deploy" | "personas" | "correlation">("grid");
  const { data: assets, isLoading: assetsLoading } = useDeceptionAssets();
  const { data: stats } = useDeceptionStats();
  const { data: correlation } = useCorrelation();
  const { data: personas, isLoading: personasLoading } = useHoneyPersonas();

  const deploy = useDeployHoneytoken();
  const deleteAsset = useDeleteDeceptionAsset();
  const simulateTrigger = useSimulateTrigger();
  const createPersona = useCreateHoneyPersona();
  const retirePersona = useRetirePersona();

  const [selectedType, setSelectedType] = useState("aws_key");
  const [selectedPlacement, setSelectedPlacement] = useState(PLACEMENTS[0]);
  const [personaContext, setPersonaContext] = useState("");

  const handleDeploy = (e: React.FormEvent) => {
    e.preventDefault();
    deploy.mutate({ tokenType: selectedType, placementLocation: selectedPlacement }, {
      onSuccess: () => setActiveTab("grid"),
    });
  };

  const handleCreatePersona = (e: React.FormEvent) => {
    e.preventDefault();
    createPersona.mutate({ deploymentContext: personaContext || undefined });
    setPersonaContext("");
  };

  const tabs = [
    { id: "grid", label: "Deception Grid", icon: Eye },
    { id: "deploy", label: "Deploy Token", icon: Plus },
    { id: "personas", label: "Honey Personas", icon: Users },
    { id: "correlation", label: "Correlation", icon: Network },
  ] as const;

  const threatLevel = stats?.threatLevel || "NOMINAL";

  return (
    <Layout>
      <div className="space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-primary/20 pb-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold flex items-center gap-3">
              <Eye className="w-8 h-8 text-primary" />
              Deception Grid
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">
              COUNTER-INTELLIGENCE & HONEYTOKEN OPERATIONS
              <span className="ml-3 text-[10px] italic text-muted-foreground/60">All deception assets are inert detection mechanisms.</span>
            </p>
          </div>
          <SeverityBadge level={threatLevel} />
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TacticalCard className="p-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">DEPLOYED</p>
            <p data-testid="text-total-deployed" className="text-3xl font-mono text-foreground">{stats?.totalDeployed || 0}</p>
          </TacticalCard>
          <TacticalCard className="p-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">ACTIVE</p>
            <p data-testid="text-active-tokens" className="text-3xl font-mono text-green-400">{stats?.activeTokens || 0}</p>
          </TacticalCard>
          <TacticalCard variant={(stats?.triggeredTokens || 0) > 0 ? "danger" : "default"} className="p-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">TRIGGERED</p>
            <p data-testid="text-triggered-tokens" className={`text-3xl font-mono ${(stats?.triggeredTokens || 0) > 0 ? "text-red-400 animate-pulse" : "text-foreground"}`}>
              {stats?.triggeredTokens || 0}
            </p>
          </TacticalCard>
          <TacticalCard className="p-4 text-center">
            <p className="text-[10px] font-mono text-muted-foreground mb-1">PERSONAS</p>
            <p data-testid="text-active-personas" className="text-3xl font-mono text-primary">{stats?.activePersonas || 0}</p>
          </TacticalCard>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-primary/10 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider rounded-t-sm border-b-2 transition-all ${
                activeTab === tab.id ? "bg-primary/10 text-primary border-primary" : "text-muted-foreground hover:bg-white/5 border-transparent"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "grid" && (
          <div className="space-y-4">
            {(stats?.triggeredTokens || 0) > 0 && (
              <TacticalCard variant="danger" className="p-4">
                <div className="flex items-center gap-3">
                  <AlertOctagon className="w-6 h-6 text-red-400 animate-pulse" />
                  <div>
                    <p className="text-sm font-bold text-red-400">ACTIVE TARGETING DETECTED</p>
                    <p className="text-xs font-mono text-red-400/70">
                      {stats?.triggeredTokens} honeytoken(s) triggered. Coordinated reconnaissance suspected.
                    </p>
                  </div>
                </div>
              </TacticalCard>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assetsLoading ? (
                <div className="col-span-full text-center text-primary/50 py-10 font-mono text-sm">SCANNING DECEPTION GRID...</div>
              ) : !assets?.length ? (
                <div className="col-span-full text-center text-primary/50 py-10 font-mono text-sm">
                  NO ASSETS DEPLOYED — USE THE DEPLOY TAB TO CREATE HONEYTOKENS
                </div>
              ) : assets.map((asset: any) => (
                <TacticalCard
                  key={asset.id}
                  data-testid={`card-asset-${asset.id}`}
                  variant={asset.triggered ? "danger" : "default"}
                  className="p-5 flex flex-col group"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <TokenIcon type={asset.assetType} />
                      <span className="bg-black/50 border border-primary/20 px-2 py-0.5 rounded-sm text-[10px] font-mono text-primary">
                        {TOKEN_TYPES.find(t => t.id === asset.assetType)?.label || asset.assetType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {asset.triggered ? (
                        <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold animate-pulse">
                          <AlertOctagon className="w-3 h-3" /> TRIGGERED
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-green-400/60 text-[10px] font-mono">
                          <CheckCircle2 className="w-3 h-3" /> ACTIVE
                        </span>
                      )}
                    </div>
                  </div>

                  {asset.tokenId && (
                    <div className="mb-2">
                      <p className="text-[10px] text-muted-foreground/60 font-mono">TOKEN ID</p>
                      <p className="text-xs font-mono text-primary/80">{asset.tokenId}</p>
                    </div>
                  )}

                  <div className="mb-2">
                    <p className="text-[10px] text-muted-foreground/60 font-mono">PAYLOAD</p>
                    <p className="text-xs font-mono text-foreground/80 truncate" title={asset.url}>{asset.url}</p>
                  </div>

                  {asset.placementLocation && (
                    <div className="mb-2">
                      <p className="text-[10px] text-muted-foreground/60 font-mono">PLACEMENT</p>
                      <p className="text-xs font-mono text-foreground/60 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {asset.placementLocation}
                      </p>
                    </div>
                  )}

                  {asset.triggered && asset.sourceIp && (
                    <div className="bg-red-500/5 border border-red-500/15 rounded-sm p-2 mb-2 space-y-1">
                      <p className="text-[10px] font-mono text-red-400/80">
                        SOURCE IP: <span className="text-red-400">{asset.sourceIp}</span>
                      </p>
                      {asset.geoLocation && (
                        <p className="text-[10px] font-mono text-red-400/60">GEO: {asset.geoLocation}</p>
                      )}
                      {asset.userAgent && (
                        <p className="text-[10px] font-mono text-red-400/40 truncate">UA: {asset.userAgent}</p>
                      )}
                      {(asset.triggerCount || 0) > 1 && (
                        <p className="text-[10px] font-mono text-red-400">TRIGGER COUNT: {asset.triggerCount}</p>
                      )}
                    </div>
                  )}

                  <div className="border-t border-primary/10 pt-3 mt-auto flex justify-between items-center">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {asset.createdAt ? format(new Date(asset.createdAt), 'MM/dd HH:mm') : 'N/A'}
                    </span>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!asset.triggered && asset.tokenId && (
                        <button
                          data-testid={`button-trigger-${asset.id}`}
                          onClick={() => simulateTrigger.mutate({ tokenId: asset.tokenId })}
                          disabled={simulateTrigger.isPending}
                          className="text-[10px] font-mono text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
                          title="Simulate Trigger"
                        >
                          <Zap className="w-3 h-3" /> TEST
                        </button>
                      )}
                      <button
                        data-testid={`button-delete-${asset.id}`}
                        onClick={() => deleteAsset.mutate(asset.id)}
                        disabled={deleteAsset.isPending}
                        className="text-[10px] font-mono text-red-400/60 hover:text-red-400 flex items-center gap-1"
                        title="Decommission"
                      >
                        <Trash2 className="w-3 h-3" /> DECOM
                      </button>
                    </div>
                  </div>
                </TacticalCard>
              ))}
            </div>
          </div>
        )}

        {activeTab === "deploy" && (
          <TacticalCard className="p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              DEPLOY HONEYTOKEN
            </h3>
            <p className="text-xs text-muted-foreground font-mono mb-6">
              Select token type and placement location. The system will generate a unique token ID, create the decoy payload, and register it for monitoring.
            </p>

            <form onSubmit={handleDeploy} className="space-y-6">
              <div>
                <label className="text-xs font-mono text-primary/70 mb-3 block">TOKEN TYPE</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {TOKEN_TYPES.map(type => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        data-testid={`select-token-${type.id}`}
                        onClick={() => setSelectedType(type.id)}
                        className={`p-4 rounded-sm border text-left transition-all ${
                          selectedType === type.id
                            ? "bg-primary/10 border-primary text-primary"
                            : "bg-black/30 border-primary/10 text-muted-foreground hover:border-primary/30"
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-2" />
                        <p className="text-sm font-bold">{type.label}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-mono text-primary/70 mb-2 block">PLACEMENT LOCATION</label>
                <select
                  data-testid="select-placement"
                  value={selectedPlacement}
                  onChange={(e) => setSelectedPlacement(e.target.value)}
                  className="w-full bg-black/50 border border-primary/30 text-foreground font-mono text-sm px-4 py-3 rounded-sm focus:outline-none focus:border-primary"
                >
                  {PLACEMENTS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <button
                data-testid="button-deploy-token"
                type="submit"
                disabled={deploy.isPending}
                className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-6 py-3 font-bold tracking-widest rounded-sm transition-all flex items-center justify-center gap-2 uppercase text-sm disabled:opacity-50"
              >
                {deploy.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                {deploy.isPending ? "DEPLOYING..." : "DEPLOY HONEYTOKEN"}
              </button>

              {deploy.isError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-sm font-mono text-sm">
                  ERROR: {deploy.error?.message || "Deployment failed"}
                </div>
              )}
            </form>
          </TacticalCard>
        )}

        {activeTab === "personas" && (
          <div className="space-y-4">
            <TacticalCard className="p-6">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                GENERATE HONEY PERSONA
              </h3>
              <p className="text-xs text-muted-foreground font-mono mb-4">
                Create synthetic decoy identity profiles for detection. These are NOT real individuals — they exist solely to detect unauthorized reconnaissance.
              </p>
              <form onSubmit={handleCreatePersona} className="flex gap-3">
                <input
                  data-testid="input-persona-context"
                  type="text"
                  value={personaContext}
                  onChange={(e) => setPersonaContext(e.target.value)}
                  placeholder="Optional: deployment context (e.g., 'Added to internal Slack')"
                  className="flex-1 bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-2 rounded-sm focus:outline-none focus:border-primary text-sm"
                />
                <button
                  data-testid="button-create-persona"
                  type="submit"
                  disabled={createPersona.isPending}
                  className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-6 py-2 font-bold tracking-widest rounded-sm transition-all flex items-center gap-2 uppercase text-sm disabled:opacity-50"
                >
                  {createPersona.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  GENERATE
                </button>
              </form>
            </TacticalCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {personasLoading ? (
                <div className="col-span-full text-center text-primary/50 py-10 font-mono text-sm">LOADING PERSONAS...</div>
              ) : !personas?.length ? (
                <div className="col-span-full text-center text-primary/50 py-10 font-mono text-sm">NO PERSONAS DEPLOYED</div>
              ) : personas.map((p: any) => (
                <TacticalCard key={p.id} data-testid={`card-persona-${p.id}`} className={`p-5 ${p.status === "RETIRED" ? "opacity-50" : ""}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{p.name}</h4>
                      <p className="text-xs font-mono text-primary/70">{p.role}</p>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${
                      p.status === "ACTIVE" ? "bg-green-500/10 text-green-400 border-green-500/30" : "bg-muted/20 text-muted-foreground border-muted/30"
                    }`}>{p.status}</span>
                  </div>
                  <div className="space-y-1 mb-3">
                    <p className="text-xs font-mono text-muted-foreground"><Mail className="w-3 h-3 inline mr-1" />{p.decoyEmail}</p>
                    {p.department && <p className="text-xs font-mono text-muted-foreground/60">DEPT: {p.department}</p>}
                    {p.deploymentContext && <p className="text-xs font-mono text-muted-foreground/60">CONTEXT: {p.deploymentContext}</p>}
                  </div>
                  <div className="border-t border-primary/10 pt-3 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {p.createdAt ? format(new Date(p.createdAt), 'MM/dd HH:mm') : 'N/A'}
                    </span>
                    {p.status === "ACTIVE" && (
                      <button
                        data-testid={`button-retire-${p.id}`}
                        onClick={() => retirePersona.mutate(p.id)}
                        disabled={retirePersona.isPending}
                        className="text-[10px] font-mono text-yellow-400/60 hover:text-yellow-400 flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> RETIRE
                      </button>
                    )}
                  </div>
                </TacticalCard>
              ))}
            </div>
          </div>
        )}

        {activeTab === "correlation" && (
          <div className="space-y-4">
            <TacticalCard variant={correlation?.riskEscalation === "CRITICAL" ? "danger" : "default"} className="p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Network className="w-5 h-5 text-primary" />
                CORRELATION ENGINE
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                  <p className="text-[10px] font-mono text-muted-foreground mb-1">ACTIVE TOKENS</p>
                  <p className="text-2xl font-mono text-foreground">{correlation?.activeTokens || 0}</p>
                </div>
                <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                  <p className="text-[10px] font-mono text-muted-foreground mb-1">TRIGGERED</p>
                  <p className={`text-2xl font-mono ${(correlation?.triggeredTokens || 0) > 0 ? "text-red-400" : "text-foreground"}`}>
                    {correlation?.triggeredTokens || 0}
                  </p>
                </div>
                <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                  <p className="text-[10px] font-mono text-muted-foreground mb-1">RISK ESCALATION</p>
                  <SeverityBadge level={correlation?.riskEscalation || "NOMINAL"} />
                </div>
              </div>

              {correlation?.multipleTriggered && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <p className="text-sm font-bold text-red-400">COORDINATED RECONNAISSANCE DETECTED</p>
                  </div>
                  <p className="text-xs font-mono text-red-400/70">
                    Multiple honeytokens triggered simultaneously. This indicates active, coordinated targeting.
                    Immediate incident response recommended.
                  </p>
                </div>
              )}

              {correlation?.correlations?.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="text-xs font-mono text-primary/70">CORRELATION EVENTS</h4>
                  {correlation.correlations.map((c: any, i: number) => (
                    <div key={i} className="bg-black/30 border border-primary/10 rounded-sm p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <SeverityBadge level={c.risk_level} />
                        <span className="text-xs font-mono text-foreground/80">{c.type}</span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground mb-1">SOURCE: {c.trigger_source}</p>
                      <p className="text-xs font-mono text-green-400/70">
                        <Shield className="w-3 h-3 inline mr-1" />
                        {c.recommended_action}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-primary/50 py-6 font-mono text-sm">
                  NO CORRELATION EVENTS — DECEPTION GRID NOMINAL
                </div>
              )}
            </TacticalCard>
          </div>
        )}
      </div>
    </Layout>
  );
}
