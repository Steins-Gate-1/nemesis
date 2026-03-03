import { useState } from "react";
import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useExternalAnalysis } from "@/hooks/use-external-intel";
import { Shield, AlertTriangle, Search, ChevronDown, ChevronUp, Globe, KeyRound, Zap, Activity } from "lucide-react";

function SeverityBadge({ level }: { level: string }) {
  const upper = (level || "UNKNOWN").toUpperCase();
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/50",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    MODERATE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    LOW: "bg-green-500/20 text-green-400 border-green-500/50",
    UNKNOWN: "bg-gray-500/20 text-gray-400 border-gray-500/50",
  };
  return (
    <span data-testid={`badge-severity-${upper.toLowerCase()}`} className={`px-3 py-1 rounded-sm border text-xs font-mono font-bold tracking-wider ${colors[upper] || colors.UNKNOWN}`}>
      {upper}
    </span>
  );
}

function ThreatMeter({ score, label }: { score: number; label: string }) {
  const pct = Math.min(score, 100);
  let color = "bg-green-500";
  let glow = "shadow-green-500/30";
  if (pct >= 50) { color = "bg-red-500"; glow = "shadow-red-500/50"; }
  else if (pct >= 30) { color = "bg-orange-500"; glow = "shadow-orange-500/40"; }
  else if (pct >= 15) { color = "bg-yellow-500"; glow = "shadow-yellow-500/30"; }

  return (
    <div data-testid={`threat-meter-${label.toLowerCase().replace(/\s/g, '-')}`} className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-mono text-muted-foreground tracking-wider uppercase">{label}</span>
        <span className="text-sm font-mono font-bold text-foreground">{score}/100</span>
      </div>
      <div className="w-full h-3 bg-black/60 rounded-sm border border-primary/20 overflow-hidden">
        <div
          className={`h-full ${color} ${glow} shadow-lg rounded-sm transition-all duration-1000 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function JsonViewer({ data, title }: { data: any; title: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!data) return null;

  return (
    <div className="border border-primary/20 rounded-sm overflow-hidden">
      <button
        data-testid={`toggle-json-${title.toLowerCase().replace(/\s/g, '-')}`}
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-black/40 hover:bg-black/60 transition-colors"
      >
        <span className="text-xs font-mono text-primary/80 tracking-wider uppercase">{title}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-primary/50" /> : <ChevronDown className="w-4 h-4 text-primary/50" />}
      </button>
      {expanded && (
        <pre className="p-4 bg-black/30 text-xs font-mono text-green-400/90 overflow-x-auto max-h-80 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function ExternalIntel() {
  const [target, setTarget] = useState("");
  const [password, setPassword] = useState("");
  const analysis = useExternalAnalysis();

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;
    analysis.mutate({ target: target.trim(), password: password.trim() || undefined });
  };

  const result = analysis.data;
  const isScanning = analysis.isPending;

  return (
    <Layout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-10 h-10 bg-primary/10 border border-primary/40 rounded-sm flex items-center justify-center">
            <Globe className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight uppercase">External Intelligence Analysis</h1>
            <p className="text-xs font-mono text-muted-foreground tracking-widest">DARKNET RECONNAISSANCE // PASSWORD EXPOSURE // COMBINED THREAT ASSESSMENT</p>
          </div>
        </div>

        <TacticalCard className="p-6">
          <form onSubmit={handleAnalyze} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-mono text-primary/70 mb-2 block tracking-wider">
                  <Globe className="w-3.5 h-3.5 inline mr-2" />
                  TARGET DOMAIN
                </label>
                <input
                  data-testid="input-target-domain"
                  type="text"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder="e.g. example.com"
                  required
                  className="w-full bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-3 rounded-sm focus:outline-none focus:border-primary text-sm placeholder:text-muted-foreground/50"
                />
              </div>
              <div>
                <label className="text-xs font-mono text-primary/70 mb-2 block tracking-wider">
                  <KeyRound className="w-3.5 h-3.5 inline mr-2" />
                  PASSWORD TO CHECK
                </label>
                <input
                  data-testid="input-password-check"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password to check exposure"
                  className="w-full bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-3 rounded-sm focus:outline-none focus:border-primary text-sm placeholder:text-muted-foreground/50"
                />
              </div>
            </div>
            <button
              data-testid="button-analyze-threat"
              type="submit"
              disabled={isScanning || !target.trim()}
              className="w-full md:w-auto px-8 py-3 bg-primary/20 border border-primary text-primary font-mono text-sm uppercase tracking-widest hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 rounded-sm"
            >
              {isScanning ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  ANALYZING THREAT SURFACE...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  ANALYZE THREAT
                </>
              )}
            </button>
          </form>
        </TacticalCard>

        {isScanning && (
          <TacticalCard className="p-6">
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <Search className="w-8 h-8 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <div className="text-center">
                <p className="text-sm font-mono text-primary animate-pulse">QUERYING DARK WEB INTELLIGENCE NETWORK...</p>
                <p className="text-xs font-mono text-muted-foreground mt-1">Routing through external backend → Tor network</p>
              </div>
              <div className="w-full max-w-md h-1 bg-black/40 rounded-full overflow-hidden">
                <div className="h-full bg-primary/60 rounded-full animate-pulse" style={{ width: "60%" }} />
              </div>
            </div>
          </TacticalCard>
        )}

        {analysis.isError && (
          <TacticalCard variant="danger" className="p-5">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <div>
                <p className="text-sm font-mono text-destructive font-bold">ANALYSIS FAILED</p>
                <p className="text-xs font-mono text-muted-foreground mt-1">{analysis.error?.message || "External intelligence backend unreachable. Verify ngrok tunnel is active."}</p>
              </div>
            </div>
          </TacticalCard>
        )}

        {result && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <TacticalCard
                variant={result.combined_risk_level === "CRITICAL" || result.combined_risk_level === "HIGH" ? "danger" : "default"}
                className="p-5 text-center"
              >
                <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-2">COMBINED THREAT SCORE</p>
                <p data-testid="text-combined-score" className="text-5xl font-mono font-bold text-foreground">{result.combined_score}</p>
                <div className="mt-3">
                  <SeverityBadge level={result.combined_risk_level} />
                </div>
              </TacticalCard>

              <TacticalCard className="p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-primary/70" />
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest">DARK WEB RISK</p>
                </div>
                <div data-testid="text-darkweb-risk">
                  <SeverityBadge level={result.dark_web_risk?.risk_level || result.dark_web_risk?.dark_web_risk_level || "UNKNOWN"} />
                </div>
                {result.dark_web_risk?.mentions !== undefined && (
                  <p className="text-xs font-mono text-muted-foreground mt-3">{result.dark_web_risk.mentions} darknet mentions</p>
                )}
              </TacticalCard>

              <TacticalCard className="p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <KeyRound className="w-4 h-4 text-primary/70" />
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest">PASSWORD RISK</p>
                </div>
                <div data-testid="text-password-risk">
                  {result.password_risk ? (
                    <SeverityBadge level={result.password_risk?.risk_level || result.password_risk?.password_risk_level || "UNKNOWN"} />
                  ) : (
                    <span className="text-xs font-mono text-muted-foreground">NOT CHECKED</span>
                  )}
                </div>
                {result.password_risk?.breach_count !== undefined && (
                  <p className="text-xs font-mono text-muted-foreground mt-3">{result.password_risk.breach_count} breach exposures</p>
                )}
              </TacticalCard>
            </div>

            <TacticalCard className="p-5">
              <ThreatMeter score={result.combined_score} label="Combined Threat Level" />
            </TacticalCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TacticalCard className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-primary" />
                  <p className="text-xs font-mono text-primary/80 tracking-widest uppercase">Dark Web Intelligence</p>
                </div>
                {result.dark_web_risk && typeof result.dark_web_risk === "object" && !result.dark_web_risk.error && (
                  <div className="space-y-2">
                    {Object.entries(result.dark_web_risk).filter(([k]) => k !== "risk_level" && k !== "dark_web_risk_level").map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center py-1 border-b border-primary/10 last:border-0">
                        <span className="text-xs font-mono text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-mono text-foreground">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.dark_web_risk?.error && (
                  <p className="text-xs font-mono text-destructive/70">{result.dark_web_risk.error}</p>
                )}
              </TacticalCard>

              <TacticalCard className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="w-4 h-4 text-primary" />
                  <p className="text-xs font-mono text-primary/80 tracking-widest uppercase">Password Intelligence</p>
                </div>
                {result.password_risk && typeof result.password_risk === "object" ? (
                  <div className="space-y-2">
                    {Object.entries(result.password_risk).filter(([k]) => k !== "risk_level" && k !== "password_risk_level").map(([key, val]) => (
                      <div key={key} className="flex justify-between items-center py-1 border-b border-primary/10 last:border-0">
                        <span className="text-xs font-mono text-muted-foreground uppercase">{key.replace(/_/g, ' ')}</span>
                        <span className="text-xs font-mono text-foreground">{typeof val === "object" ? JSON.stringify(val) : String(val)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-muted-foreground">No password provided for analysis</p>
                )}
              </TacticalCard>
            </div>

            <div className="space-y-3">
              <JsonViewer data={result.dark_web_risk} title="Raw Dark Web Intelligence" />
              <JsonViewer data={result.password_risk} title="Raw Password Intelligence" />
              <JsonViewer data={result} title="Full Aggregated Response" />
            </div>
          </div>
        )}

        {!result && !isScanning && !analysis.isError && (
          <TacticalCard className="p-8 text-center">
            <Activity className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <p className="text-sm font-mono text-muted-foreground">Enter a target domain and optional password to begin threat analysis</p>
            <p className="text-xs font-mono text-muted-foreground/60 mt-2">Architecture: Frontend → Replit Backend → ngrok Flask → Tor + Password Modules</p>
          </TacticalCard>
        )}
      </div>
    </Layout>
  );
}
