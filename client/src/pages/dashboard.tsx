import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useDashboardStats, useAnalyzeTarget, useSystemHealth } from "@/hooks/use-dashboard";
import { useActiveAlerts, useUpdateAlertStatus } from "@/hooks/use-alerts";
import { useAuditLogs } from "@/hooks/use-audit";
import { useBreaches, useInfrastructureExposure, useGithubExposure, useAttackScenarios } from "@/hooks/use-threats";
import { useGenerateReport } from "@/hooks/use-risk";
import { Activity, ShieldAlert, Target, Zap, AlertTriangle, CheckCircle2, Globe, Server, GitBranch, FileWarning, X, Eye, Fingerprint, Crosshair, FileText, HeartPulse, Clock, ChevronDown } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const mockActivityData = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  events: Math.floor(Math.random() * 50) + 10,
  attacks: Math.floor(Math.random() * 10),
}));

function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    MODERATE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    LOW: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${colors[level] || colors.LOW}`}>
      {level}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    OPEN: "bg-red-500/20 text-red-400 border-red-500/40",
    ACKNOWLEDGED: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    UNDER_REVIEW: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    RESOLVED: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return (
    <span data-testid={`badge-status-${status}`} className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${colors[status] || colors.OPEN}`}>
      {status}
    </span>
  );
}

function ApiStatusDot({ success }: { success: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${success ? "bg-green-400" : "bg-red-400"}`} />
  );
}

function RiskMeter({ score, size = 140 }: { score: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "hsl(0, 100%, 60%)" : score >= 50 ? "hsl(30, 100%, 55%)" : score >= 25 ? "hsl(50, 100%, 55%)" : "hsl(120, 70%, 50%)";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(0,255,255,0.1)" strokeWidth="8" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-mono font-bold text-foreground" data-testid="text-risk-meter-score">{score}</span>
        <span className="text-[10px] font-mono text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function ActionTypeColor(actionType: string | null | undefined): string {
  if (!actionType) return "text-muted-foreground";
  const t = actionType.toUpperCase();
  if (t.includes("CRITICAL") || t.includes("ALERT") || t.includes("BREACH")) return "text-red-400";
  if (t.includes("SCAN") || t.includes("ATTACK") || t.includes("THREAT")) return "text-orange-400";
  if (t.includes("DEPLOY") || t.includes("CREATE")) return "text-yellow-400";
  if (t.includes("RESOLVE") || t.includes("SUCCESS")) return "text-green-400";
  return "text-primary/70";
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: activeAlerts, isLoading: alertsLoading } = useActiveAlerts();
  const { data: auditLogs, isLoading: auditLoading } = useAuditLogs();
  const { data: breaches } = useBreaches();
  const { data: infra } = useInfrastructureExposure();
  const { data: github } = useGithubExposure();
  const { data: scenarios } = useAttackScenarios();
  const updateStatus = useUpdateAlertStatus();
  const generateReport = useGenerateReport();
  const { data: health } = useSystemHealth();
  const analyze = useAnalyzeTarget();
  
  const [targetInput, setTargetInput] = useState("");
  const [targetType, setTargetType] = useState<"domain" | "email">("domain");
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [showHealth, setShowHealth] = useState(false);

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput) return;
    analyze.mutate({ target: targetInput, type: targetType }, {
      onSuccess: (result: any) => {
        setTargetInput("");
        if (result?.data) {
          setAnalysisResult(result.data);
        }
      }
    });
  };

  const recentLogs = (auditLogs || []).slice(0, 15);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        {/* ZONE 1: Header + Scanner + Risk Meter + Stats */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-primary/20 pb-4">
          <div className="flex items-center gap-6">
            <div>
              <h1 data-testid="text-page-title" className="text-3xl font-bold">Command Center</h1>
              <p className="text-muted-foreground font-mono text-sm mt-1">
                SYSTEM STATUS: {health?.status?.toUpperCase() || "NOMINAL"} | UPTIME: {health?.uptime ? `${Math.floor(health.uptime / 3600)}h` : "99.99%"}
              </p>
            </div>
            {!statsLoading && stats && (
              <RiskMeter score={stats.totalRiskScore || 0} />
            )}
          </div>
          
          <form onSubmit={handleAnalyze} className="flex w-full md:w-auto gap-2">
            <select 
              data-testid="select-target-type"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as "domain" | "email")}
              className="bg-black/50 border border-primary/30 text-primary font-mono text-sm px-3 rounded-sm focus:outline-none focus:border-primary"
            >
              <option value="domain">DOMAIN</option>
              <option value="email">EMAIL</option>
            </select>
            <input 
              data-testid="input-target"
              type="text" 
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="Enter target..."
              className="bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-2 rounded-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 w-full md:w-64"
            />
            <button 
              data-testid="button-analyze"
              type="submit"
              disabled={analyze.isPending}
              className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-6 py-2 font-bold tracking-widest rounded-sm transition-all flex items-center gap-2 uppercase text-sm disabled:opacity-50"
            >
              {analyze.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              {analyze.isPending ? "SCANNING" : "Analyze"}
            </button>
          </form>
        </header>

        {analyze.isError && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-sm font-mono text-sm">
            ERROR: {analyze.error?.message || "Analysis failed"}
          </div>
        )}

        {analysisResult && (
          <TacticalCard variant="warning" className="p-6 relative">
            <button 
              data-testid="button-close-results"
              onClick={() => setAnalysisResult(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Globe className="w-6 h-6 text-primary" />
              <h3 className="text-lg font-bold font-mono">OSINT ANALYSIS: {analysisResult.domain}</h3>
              <SeverityBadge level={analysisResult.exposure_level} />
              <span className="text-muted-foreground font-mono text-xs ml-auto">
                SCORE: {analysisResult.exposure_score}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="bg-black/40 border border-primary/10 p-3 rounded-sm">
                <div className="flex items-center gap-2 mb-1">
                  <ApiStatusDot success={analysisResult.api_status?.hibp?.success} />
                  <span className="text-[10px] font-mono text-muted-foreground">HIBP</span>
                </div>
                <p className="text-2xl font-mono text-foreground">{analysisResult.breach_summary?.total_breaches || 0}</p>
                <p className="text-[10px] font-mono text-muted-foreground">BREACHES</p>
              </div>
              <div className="bg-black/40 border border-primary/10 p-3 rounded-sm">
                <div className="flex items-center gap-2 mb-1">
                  <ApiStatusDot success={analysisResult.api_status?.shodan?.success} />
                  <span className="text-[10px] font-mono text-muted-foreground">SHODAN</span>
                </div>
                <p className="text-2xl font-mono text-foreground">{analysisResult.infrastructure_summary?.hosts?.length || 0}</p>
                <p className="text-[10px] font-mono text-muted-foreground">HOSTS</p>
              </div>
              <div className="bg-black/40 border border-primary/10 p-3 rounded-sm">
                <div className="flex items-center gap-2 mb-1">
                  <ApiStatusDot success={analysisResult.api_status?.github?.success} />
                  <span className="text-[10px] font-mono text-muted-foreground">GITHUB</span>
                </div>
                <p className="text-2xl font-mono text-foreground">{analysisResult.github_summary?.total_exposures || 0}</p>
                <p className="text-[10px] font-mono text-muted-foreground">LEAKS</p>
              </div>
              <div className="bg-black/40 border border-primary/10 p-3 rounded-sm">
                <div className="flex items-center gap-2 mb-1">
                  <ApiStatusDot success={analysisResult.api_status?.whois?.success} />
                  <span className="text-[10px] font-mono text-muted-foreground">WHOIS</span>
                </div>
                <p className="text-2xl font-mono text-foreground">{analysisResult.whois_summary?.domainAgeDays || 0}</p>
                <p className="text-[10px] font-mono text-muted-foreground">AGE (DAYS)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {analysisResult.whois_summary?.registrar && (
                <div className="text-xs font-mono text-muted-foreground">
                  REGISTRAR: <span className="text-foreground/80">{analysisResult.whois_summary.registrar}</span>
                </div>
              )}
              {analysisResult.whois_summary?.riskFlags?.length > 0 && (
                <div className="text-xs font-mono">
                  {analysisResult.whois_summary.riskFlags.map((flag: string, i: number) => (
                    <span key={i} className="text-yellow-400 mr-2">
                      <FileWarning className="w-3 h-3 inline mr-1" />{flag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {Object.values(analysisResult.api_status || {}).some((s: any) => s.error) && (
              <div className="mt-3 text-[10px] font-mono text-muted-foreground/60 space-y-1">
                {Object.entries(analysisResult.api_status || {}).map(([key, val]: [string, any]) => (
                  val.error ? <div key={key} className="text-yellow-400/60">[{key.toUpperCase()}] {val.error}</div> : null
                ))}
              </div>
            )}
          </TacticalCard>
        )}

        {/* 6 Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <TacticalCard variant={stats?.activeAlerts && stats.activeAlerts > 0 ? "danger" : "default"} className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1">ACTIVE ALERTS</p>
                <h3 data-testid="text-active-alerts" className="text-3xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.activeAlerts ?? 0}
                </h3>
              </div>
              <ShieldAlert className={`w-6 h-6 ${stats?.activeAlerts && stats.activeAlerts > 0 ? 'text-destructive animate-pulse' : 'text-primary/50'}`} />
            </div>
          </TacticalCard>
          
          <TacticalCard className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1">RISK INDEX</p>
                <h3 data-testid="text-risk-index" className="text-3xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.totalRiskScore ?? 0}
                </h3>
              </div>
              <Activity className="w-6 h-6 text-primary/50" />
            </div>
          </TacticalCard>
          
          <TacticalCard className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1">EXPOSED ASSETS</p>
                <h3 data-testid="text-exposed-assets" className="text-3xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.exposedAssets ?? 0}
                </h3>
              </div>
              <Server className="w-6 h-6 text-primary/50" />
            </div>
          </TacticalCard>
          
          <TacticalCard className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1">DECEPTION</p>
                <h3 data-testid="text-deception-triggers" className="text-3xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.deceptionTokensTriggered ?? 0}
                </h3>
              </div>
              <Zap className="w-6 h-6 text-primary/50" />
            </div>
          </TacticalCard>

          <TacticalCard className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1">DEEPFAKE</p>
                <h3 data-testid="text-deepfake-threats" className="text-3xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.deepfakeThreats ?? 0}
                </h3>
              </div>
              <Fingerprint className="w-6 h-6 text-primary/50" />
            </div>
          </TacticalCard>

          <TacticalCard className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1">TARGETING</p>
                <h3 data-testid="text-active-targeting" className={`text-xl font-mono font-bold ${stats?.activeTargeting ? 'text-red-400' : 'text-green-400'}`}>
                  {statsLoading ? "..." : stats?.activeTargeting ? "ACTIVE" : "CLEAR"}
                </h3>
              </div>
              <Crosshair className={`w-6 h-6 ${stats?.activeTargeting ? 'text-red-400 animate-pulse' : 'text-green-400/50'}`} />
            </div>
          </TacticalCard>
        </div>

        {/* ZONE 2: Main Body - 2 Column */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Network Traffic + Intelligence Summary */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <TacticalCard className="p-6 flex flex-col h-[350px]">
              <h3 className="text-lg mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                NETWORK TRAFFIC ANALYSIS
              </h3>
              <div className="flex-1 min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockActivityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(190, 100%, 50%)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorAttacks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(0, 100%, 60%)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(0, 100%, 60%)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 255, 255, 0.1)" vertical={false} />
                    <XAxis dataKey="time" stroke="rgba(0, 255, 255, 0.5)" tick={{fontFamily: 'monospace', fontSize: 10}} />
                    <YAxis stroke="rgba(0, 255, 255, 0.5)" tick={{fontFamily: 'monospace', fontSize: 10}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(0, 10, 20, 0.9)', border: '1px solid rgba(0, 255, 255, 0.3)', borderRadius: '2px', fontFamily: 'monospace' }}
                    />
                    <Area type="monotone" dataKey="events" stroke="hsl(190, 100%, 50%)" fillOpacity={1} fill="url(#colorEvents)" />
                    <Area type="monotone" dataKey="attacks" stroke="hsl(0, 100%, 60%)" fillOpacity={1} fill="url(#colorAttacks)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TacticalCard>

            <TacticalCard className="p-6">
              <h3 className="text-lg mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                INTELLIGENCE SUMMARY
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                  <p className="text-3xl font-mono text-foreground" data-testid="text-breach-count">{breaches?.length ?? 0}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">BREACH RECORDS</p>
                </div>
                <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                  <p className="text-3xl font-mono text-foreground" data-testid="text-infra-count">{infra?.length ?? 0}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">INFRA EXPOSED</p>
                </div>
                <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                  <p className="text-3xl font-mono text-foreground" data-testid="text-github-count">{github?.length ?? 0}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">GITHUB LEAKS</p>
                </div>
                <div className="bg-black/40 border border-primary/10 p-4 rounded-sm text-center">
                  <p className="text-3xl font-mono text-foreground" data-testid="text-scenario-count">{scenarios?.length ?? 0}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">ATTACK SCENARIOS</p>
                </div>
              </div>
            </TacticalCard>
          </div>

          {/* Right Column - Active Alerts + Quick Actions */}
          <div className="flex flex-col gap-6">
            <TacticalCard className="flex flex-col max-h-[450px]">
              <div className="p-4 border-b border-primary/20 flex justify-between items-center gap-1 bg-primary/5">
                <h3 className="text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-warning" />
                  ACTIVE ALERTS
                </h3>
                <span className="bg-destructive text-white text-[10px] px-2 py-0.5 rounded-sm font-mono">
                  {(activeAlerts || []).length} PENDING
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {alertsLoading ? (
                  <div className="text-center text-primary/50 py-10 font-mono text-sm">SCANNING FEED...</div>
                ) : (activeAlerts || []).length === 0 ? (
                  <div className="text-center text-primary/50 py-10 font-mono text-sm">ALL CLEAR</div>
                ) : (
                  (activeAlerts || []).map((alert: any) => (
                    <div key={alert.id} data-testid={`card-alert-${alert.id}`} className="bg-black/40 border border-primary/10 p-3 rounded-sm hover:border-primary/40 transition-colors group">
                      <div className="flex justify-between items-start mb-1 gap-1 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                            alert.severity === 'Critical' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                            alert.severity === 'High' ? 'bg-warning/20 text-warning border border-warning/30' :
                            'bg-primary/10 text-primary border border-primary/30'
                          }`}>
                            {alert.severity?.toUpperCase()}
                          </span>
                          <StatusBadge status={alert.status || "OPEN"} />
                        </div>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {alert.createdAt ? format(new Date(alert.createdAt), 'HH:mm:ss') : 'N/A'}
                        </span>
                      </div>
                      <h4 className="text-sm text-foreground/90 font-semibold mb-1 truncate" title={alert.title}>{alert.title}</h4>
                      <div className="flex justify-between items-end mt-2 gap-2">
                        <p className="text-xs text-muted-foreground font-mono truncate flex-1" title={alert.description}>{alert.description}</p>
                        <div className="relative shrink-0">
                          <select
                            data-testid={`select-alert-status-${alert.id}`}
                            value={alert.status || "OPEN"}
                            onChange={(e) => updateStatus.mutate({ id: alert.id, status: e.target.value as any })}
                            disabled={updateStatus.isPending}
                            className="appearance-none bg-black/60 border border-primary/30 text-primary font-mono text-[10px] pl-2 pr-5 py-1 rounded-sm focus:outline-none focus:border-primary cursor-pointer"
                          >
                            <option value="OPEN">OPEN</option>
                            <option value="ACKNOWLEDGED">ACK</option>
                            <option value="UNDER_REVIEW">REVIEW</option>
                            <option value="RESOLVED">RESOLVED</option>
                          </select>
                          <ChevronDown className="w-3 h-3 text-primary/50 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TacticalCard>

            <TacticalCard className="p-6">
              <h3 className="text-lg mb-4 flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                QUICK ACTIONS
              </h3>
              <div className="space-y-3">
                <button
                  data-testid="button-generate-report"
                  onClick={() => generateReport.mutate({ reportType: "EXECUTIVE_SUMMARY" })}
                  disabled={generateReport.isPending}
                  className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-4 py-3 font-mono text-sm rounded-sm transition-all flex items-center gap-3 disabled:opacity-50"
                >
                  <FileText className="w-4 h-4" />
                  {generateReport.isPending ? "GENERATING..." : "GENERATE EXECUTIVE REPORT"}
                </button>
                <button
                  data-testid="button-view-health"
                  onClick={() => setShowHealth(!showHealth)}
                  className="w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-4 py-3 font-mono text-sm rounded-sm transition-all flex items-center gap-3"
                >
                  <HeartPulse className="w-4 h-4" />
                  VIEW SYSTEM HEALTH
                </button>
              </div>
              {showHealth && health && (
                <div className="mt-4 bg-black/40 border border-primary/10 p-4 rounded-sm space-y-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">STATUS</span>
                    <span className={`text-xs font-mono ${health.status === 'healthy' ? 'text-green-400' : 'text-red-400'}`}>{health.status?.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">DATABASE</span>
                    <span className={`text-xs font-mono ${health.dbStatus === 'connected' ? 'text-green-400' : 'text-red-400'}`}>{health.dbStatus?.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">UPTIME</span>
                    <span className="text-xs font-mono text-foreground">{health.uptime ? `${Math.floor(health.uptime / 3600)}h ${Math.floor((health.uptime % 3600) / 60)}m` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">INTEGRATIONS</span>
                    <span className="text-xs font-mono text-foreground">{health.activeIntegrations?.length ?? 0}</span>
                  </div>
                  {health.activeIntegrations?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {health.activeIntegrations.map((name: string) => (
                        <span key={name} className="text-[10px] font-mono bg-green-500/10 text-green-400 border border-green-500/30 px-2 py-0.5 rounded-sm">{name}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TacticalCard>
          </div>
        </div>

        {/* ZONE 3: Intelligence Timeline */}
        <TacticalCard className="p-6">
          <h3 className="text-lg mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            INTELLIGENCE TIMELINE
          </h3>
          <div className="space-y-1">
            {auditLoading ? (
              <div className="text-primary/50 font-mono text-sm animate-pulse py-4 text-center">LOADING TIMELINE...</div>
            ) : recentLogs.length === 0 ? (
              <div className="text-primary/50 font-mono text-sm py-4 text-center">NO EVENTS RECORDED</div>
            ) : (
              recentLogs.map((log: any) => (
                <div key={log.id} data-testid={`timeline-entry-${log.id}`} className="flex items-start gap-3 py-2 border-b border-primary/5 last:border-0 hover:bg-white/5 px-2 rounded-sm transition-colors">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${ActionTypeColor(log.actionType).replace('text-', 'bg-')}`} />
                  <span className="text-primary/60 font-mono text-xs shrink-0 w-36">
                    {log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm') : 'UNKNOWN'}
                  </span>
                  <span className="text-warning font-mono text-xs shrink-0 w-20 truncate" title={log.user || 'system'}>
                    {log.user || 'system'}
                  </span>
                  <span className={`font-mono text-xs font-bold shrink-0 ${ActionTypeColor(log.actionType)}`}>
                    {log.action}
                  </span>
                  {log.actionType && (
                    <span className="text-[10px] font-mono bg-primary/10 text-primary/60 px-1.5 py-0.5 rounded-sm border border-primary/20 shrink-0">
                      {log.actionType}
                    </span>
                  )}
                  <span className="text-muted-foreground font-mono text-xs truncate" title={log.details || ''}>
                    {log.details || ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </TacticalCard>
      </div>
    </Layout>
  );
}
