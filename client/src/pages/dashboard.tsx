import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useDashboardStats, useAnalyzeTarget } from "@/hooks/use-dashboard";
import { useAlerts, useMarkAlertRead } from "@/hooks/use-alerts";
import { Activity, ShieldAlert, Target, Zap, AlertTriangle, CheckCircle2, Globe, Server, GitBranch, FileWarning, X } from "lucide-react";
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

function ApiStatusDot({ success }: { success: boolean }) {
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${success ? "bg-green-400" : "bg-red-400"}`} />
  );
}

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const markRead = useMarkAlertRead();
  const analyze = useAnalyzeTarget();
  
  const [targetInput, setTargetInput] = useState("");
  const [targetType, setTargetType] = useState<"domain" | "email">("domain");
  const [analysisResult, setAnalysisResult] = useState<any>(null);

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

  const activeAlerts = alerts?.filter(a => !a.isRead) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-primary/20 pb-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold">Command Center</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">SYSTEM STATUS: NOMINAL | UPTIME: 99.99%</p>
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
          <TacticalCard variant="highlight" className="p-6 relative">
            <button 
              data-testid="button-close-results"
              onClick={() => setAnalysisResult(null)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TacticalCard variant={stats?.activeAlerts && stats.activeAlerts > 5 ? "danger" : "default"} className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">ACTIVE ALERTS</p>
                <h3 data-testid="text-active-alerts" className="text-4xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.activeAlerts}
                </h3>
              </div>
              <ShieldAlert className={`w-8 h-8 ${stats?.activeAlerts && stats.activeAlerts > 5 ? 'text-destructive animate-pulse' : 'text-primary/50'}`} />
            </div>
          </TacticalCard>
          
          <TacticalCard className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">GLOBAL RISK INDEX</p>
                <h3 data-testid="text-risk-index" className="text-4xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.totalRiskScore}
                </h3>
              </div>
              <Activity className="w-8 h-8 text-primary/50" />
            </div>
          </TacticalCard>
          
          <TacticalCard className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">EXPOSED ASSETS</p>
                <h3 data-testid="text-exposed-assets" className="text-4xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.exposedAssets}
                </h3>
              </div>
              <Server className="w-8 h-8 text-primary/50" />
            </div>
          </TacticalCard>
          
          <TacticalCard className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">DECEPTION TRIGGERS</p>
                <h3 data-testid="text-deception-triggers" className="text-4xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.deceptionTokensTriggered}
                </h3>
              </div>
              <Zap className="w-8 h-8 text-primary/50" />
            </div>
          </TacticalCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          <TacticalCard className="lg:col-span-2 p-6 flex flex-col">
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

          <TacticalCard className="flex flex-col">
            <div className="p-4 border-b border-primary/20 flex justify-between items-center gap-1 bg-primary/5">
              <h3 className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                ACTIVE ALERTS
              </h3>
              <span className="bg-destructive text-white text-[10px] px-2 py-0.5 rounded-sm font-mono">
                {activeAlerts.length} PENDING
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {alertsLoading ? (
                <div className="text-center text-primary/50 py-10 font-mono text-sm">SCANNING FEED...</div>
              ) : activeAlerts.length === 0 ? (
                <div className="text-center text-primary/50 py-10 font-mono text-sm">ALL CLEAR</div>
              ) : (
                activeAlerts.map(alert => (
                  <div key={alert.id} data-testid={`card-alert-${alert.id}`} className="bg-black/40 border border-primary/10 p-3 rounded-sm hover:border-primary/40 transition-colors group">
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm ${
                        alert.severity === 'Critical' ? 'bg-destructive/20 text-destructive border border-destructive/30' :
                        alert.severity === 'High' ? 'bg-warning/20 text-warning border border-warning/30' :
                        'bg-primary/10 text-primary border border-primary/30'
                      }`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {alert.createdAt ? format(new Date(alert.createdAt), 'HH:mm:ss') : 'N/A'}
                      </span>
                    </div>
                    <h4 className="text-sm text-foreground/90 font-semibold mb-1 truncate" title={alert.title}>{alert.title}</h4>
                    <div className="flex justify-between items-end mt-2">
                      <p className="text-xs text-muted-foreground font-mono truncate w-2/3" title={alert.description}>{alert.description}</p>
                      <button 
                        data-testid={`button-ack-alert-${alert.id}`}
                        onClick={() => markRead.mutate(alert.id)}
                        disabled={markRead.isPending}
                        className="text-[10px] text-primary hover:text-white flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        ACK
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TacticalCard>
        </div>
      </div>
    </Layout>
  );
}
