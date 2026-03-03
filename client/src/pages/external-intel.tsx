import { useState } from "react";
import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useExternalAnalysis } from "@/hooks/use-external-intel";
import type { AnalyzeResult } from "@/hooks/use-external-intel";
import { Shield, AlertTriangle, Search, ChevronDown, ChevronUp, Globe, KeyRound, Zap, Activity, Target, TrendingUp, FileWarning } from "lucide-react";

function SeverityBadge({ level }: { level: string }) {
  const upper = (level || "UNKNOWN").toUpperCase();
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/50",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/50",
    MODERATE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
    LOW: "bg-green-500/20 text-green-400 border-green-500/50",
    SAFE: "bg-green-500/20 text-green-400 border-green-500/50",
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
  if (pct >= 76) { color = "bg-red-500"; glow = "shadow-red-500/50"; }
  else if (pct >= 46) { color = "bg-orange-500"; glow = "shadow-orange-500/40"; }
  else if (pct >= 21) { color = "bg-yellow-500"; glow = "shadow-yellow-500/30"; }

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

function AttackProbabilityGauge({ probability }: { probability: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(probability, 100);
  const offset = circumference - (pct / 100) * circumference;
  let strokeColor = "#22c55e";
  if (pct >= 76) strokeColor = "#ef4444";
  else if (pct >= 46) strokeColor = "#f97316";
  else if (pct >= 21) strokeColor = "#eab308";

  return (
    <div data-testid="gauge-attack-probability" className="flex flex-col items-center">
      <svg width="180" height="180" className="-rotate-90">
        <circle cx="90" cy="90" r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
        <circle
          cx="90" cy="90" r={radius} fill="none"
          stroke={strokeColor} strokeWidth="12"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
          style={{ filter: `drop-shadow(0 0 8px ${strokeColor}80)` }}
        />
      </svg>
      <div className="absolute mt-14 text-center">
        <p className="text-4xl font-mono font-bold text-foreground">{probability.toFixed(1)}%</p>
        <p className="text-[10px] font-mono text-muted-foreground tracking-widest mt-1">ATTACK PROBABILITY</p>
      </div>
    </div>
  );
}

function CorrelationTriggersPanel({ result }: { result: AnalyzeResult }) {
  const triggers = result.correlation_triggers || [];

  return (
    <TacticalCard variant={triggers.length > 0 ? "warning" : "default"} className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <FileWarning className="w-4 h-4 text-primary" />
        <p className="text-xs font-mono text-primary/80 tracking-widest uppercase">Escalation Rules Engine</p>
        <span className="ml-auto text-xs font-mono text-muted-foreground">{triggers.length} TRIGGERED</span>
      </div>
      {triggers.length === 0 ? (
        <p className="text-xs font-mono text-muted-foreground">No conditional escalation rules triggered. Baseline scoring applied.</p>
      ) : (
        <div className="space-y-3">
          {triggers.map((t, i) => (
            <div key={i} data-testid={`trigger-${t.rule_id}`} className="border border-orange-500/30 bg-orange-500/5 rounded-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-orange-500/20 text-orange-400 border border-orange-500/40 rounded-sm">{t.rule_id}</span>
                  <span className="text-xs font-mono font-bold text-foreground">{t.rule_name}</span>
                </div>
                <span className="text-xs font-mono text-orange-400 font-bold">+{t.escalation_points} pts</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground mb-2">{t.description}</p>
              <div className="space-y-1">
                {t.conditions_met.map((c: string, ci: number) => (
                  <div key={ci} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full" />
                    <span className="text-[11px] font-mono text-foreground/70">{c}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </TacticalCard>
  );
}

function SignalBreakdownPanel({ result }: { result: AnalyzeResult }) {
  const signals = result.individual_signals || {};
  const weights = result.weighted_scores || {};

  return (
    <TacticalCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <p className="text-xs font-mono text-primary/80 tracking-widest uppercase">Signal Decomposition</p>
      </div>
      <div className="space-y-3">
        {Object.entries(signals).map(([key, val]: [string, any]) => (
          <div key={key} className="border border-primary/10 bg-black/30 rounded-sm p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-foreground uppercase">{key.replace(/_/g, ' ')}</span>
              <SeverityBadge level={val.raw_risk_level} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-muted-foreground">BASE SCORE</span>
              <span className="text-sm font-mono text-foreground">{val.base_score}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] font-mono text-muted-foreground">WEIGHTED CONTRIBUTION</span>
              <span className="text-sm font-mono text-primary">{weights[key] ?? val.base_score}</span>
            </div>
            <div className="mt-2 w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all duration-700"
                style={{ width: `${Math.min((weights[key] ?? val.base_score), 50) * 2}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </TacticalCard>
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
            <p className="text-xs font-mono text-muted-foreground tracking-widest">CORRELATION ENGINE // ATTACK PROBABILITY MODEL // EXPLAINABILITY REPORT</p>
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
                  CORRELATING SIGNALS...
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
                <p className="text-sm font-mono text-primary animate-pulse">QUERYING INTELLIGENCE NETWORK & CORRELATION ENGINE...</p>
                <p className="text-xs font-mono text-muted-foreground mt-1">Signal acquisition → Weighted scoring → Escalation rules → Attack probability model</p>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

              <TacticalCard className="p-5 text-center relative overflow-visible">
                <AttackProbabilityGauge probability={result.attack_probability_percentage} />
              </TacticalCard>

              <TacticalCard className="p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-primary/70" />
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest">DARK WEB SIGNAL</p>
                </div>
                <div data-testid="text-darkweb-risk">
                  <SeverityBadge level={result.dark_web_risk?.risk_level || result.dark_web_risk?.dark_web_risk_level || "UNKNOWN"} />
                </div>
                <p className="text-lg font-mono font-bold text-foreground mt-2">
                  {result.individual_signals?.dark_web?.base_score ?? 0}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">BASE SCORE</p>
              </TacticalCard>

              <TacticalCard className="p-5 text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <KeyRound className="w-4 h-4 text-primary/70" />
                  <p className="text-[10px] font-mono text-muted-foreground tracking-widest">CREDENTIAL SIGNAL</p>
                </div>
                <div data-testid="text-password-risk">
                  {result.password_risk ? (
                    <SeverityBadge level={result.individual_signals?.credentials?.raw_risk_level || "UNKNOWN"} />
                  ) : (
                    <span className="text-xs font-mono text-muted-foreground">NOT CHECKED</span>
                  )}
                </div>
                <p className="text-lg font-mono font-bold text-foreground mt-2">
                  {result.individual_signals?.credentials?.base_score ?? 0}
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">BASE SCORE</p>
              </TacticalCard>
            </div>

            <TacticalCard className="p-5 space-y-3">
              <ThreatMeter score={result.combined_score} label="Combined Threat Level" />
              <ThreatMeter score={Math.round(result.attack_probability_percentage)} label="Attack Probability" />
            </TacticalCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CorrelationTriggersPanel result={result} />
              <SignalBreakdownPanel result={result} />
            </div>

            <TacticalCard className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <p className="text-xs font-mono text-primary/80 tracking-widest uppercase">Explainability Report</p>
              </div>
              <pre data-testid="text-explainability-report" className="text-xs font-mono text-foreground/80 whitespace-pre-wrap leading-relaxed bg-black/30 border border-primary/10 p-4 rounded-sm">
                {result.explainability_report}
              </pre>
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
              <JsonViewer data={result} title="Full Correlation Engine Output" />
            </div>
          </div>
        )}

        {!result && !isScanning && !analysis.isError && (
          <TacticalCard className="p-8 text-center">
            <Activity className="w-12 h-12 text-primary/30 mx-auto mb-4" />
            <p className="text-sm font-mono text-muted-foreground">Enter a target domain and optional password to initiate correlation analysis</p>
            <p className="text-xs font-mono text-muted-foreground/60 mt-2">Architecture: Frontend → Replit Backend → ngrok Flask → Tor + Password Modules → Correlation Engine</p>
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
              <div className="bg-black/30 border border-primary/10 p-3 rounded-sm text-center">
                <p className="text-[10px] font-mono text-muted-foreground">SCORING</p>
                <p className="text-xs font-mono text-primary mt-1">Weighted Signals</p>
              </div>
              <div className="bg-black/30 border border-primary/10 p-3 rounded-sm text-center">
                <p className="text-[10px] font-mono text-muted-foreground">ESCALATION</p>
                <p className="text-xs font-mono text-primary mt-1">4 Conditional Rules</p>
              </div>
              <div className="bg-black/30 border border-primary/10 p-3 rounded-sm text-center">
                <p className="text-[10px] font-mono text-muted-foreground">PROBABILITY</p>
                <p className="text-xs font-mono text-primary mt-1">Attack Model</p>
              </div>
              <div className="bg-black/30 border border-primary/10 p-3 rounded-sm text-center">
                <p className="text-[10px] font-mono text-muted-foreground">REPORTING</p>
                <p className="text-xs font-mono text-primary mt-1">SOC-Grade Output</p>
              </div>
            </div>
          </TacticalCard>
        )}
      </div>
    </Layout>
  );
}
