import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useDashboardStats, useAnalyzeTarget } from "@/hooks/use-dashboard";
import { useAlerts, useMarkAlertRead } from "@/hooks/use-alerts";
import { Activity, ShieldAlert, Target, Zap, AlertTriangle, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

// Mock data for the activity chart since it's not in the API response directly
const mockActivityData = Array.from({ length: 24 }).map((_, i) => ({
  time: `${i}:00`,
  events: Math.floor(Math.random() * 50) + 10,
  attacks: Math.floor(Math.random() * 10),
}));

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();
  const markRead = useMarkAlertRead();
  const analyze = useAnalyzeTarget();
  
  const [targetInput, setTargetInput] = useState("");
  const [targetType, setTargetType] = useState<"domain" | "email">("domain");

  const handleAnalyze = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput) return;
    analyze.mutate({ target: targetInput, type: targetType }, {
      onSuccess: () => setTargetInput("")
    });
  };

  const activeAlerts = alerts?.filter(a => !a.isRead) || [];

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-primary/20 pb-4">
          <div>
            <h1 className="text-3xl font-bold">Command Center</h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">SYSTEM STATUS: NOMINAL | UPTIME: 99.99%</p>
          </div>
          
          <form onSubmit={handleAnalyze} className="flex w-full md:w-auto gap-2">
            <select 
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as "domain" | "email")}
              className="bg-black/50 border border-primary/30 text-primary font-mono text-sm px-3 rounded-sm focus:outline-none focus:border-primary"
            >
              <option value="domain">DOMAIN</option>
              <option value="email">EMAIL</option>
            </select>
            <input 
              type="text" 
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="Enter target..."
              className="bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-2 rounded-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 w-full md:w-64"
            />
            <button 
              type="submit"
              disabled={analyze.isPending}
              className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-6 py-2 font-bold tracking-widest rounded-sm transition-all flex items-center gap-2 uppercase text-sm disabled:opacity-50"
            >
              {analyze.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
              Analyze
            </button>
          </form>
        </header>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TacticalCard variant={stats?.activeAlerts && stats.activeAlerts > 5 ? "danger" : "default"} className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">ACTIVE ALERTS</p>
                <h3 className="text-4xl font-mono text-foreground">
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
                <h3 className="text-4xl font-mono text-foreground">
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
                <h3 className="text-4xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.exposedAssets}
                </h3>
              </div>
              <Target className="w-8 h-8 text-warning/50" />
            </div>
          </TacticalCard>
          
          <TacticalCard className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-mono text-muted-foreground mb-1">DECEPTION TRIGGERS</p>
                <h3 className="text-4xl font-mono text-foreground">
                  {statsLoading ? "..." : stats?.deceptionTokensTriggered}
                </h3>
              </div>
              <Zap className="w-8 h-8 text-primary/50" />
            </div>
          </TacticalCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[500px]">
          {/* Main Chart */}
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

          {/* Alert Feed */}
          <TacticalCard className="flex flex-col">
            <div className="p-4 border-b border-primary/20 flex justify-between items-center bg-primary/5">
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
                  <div key={alert.id} className="bg-black/40 border border-primary/10 p-3 rounded-sm hover:border-primary/40 transition-colors group">
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
