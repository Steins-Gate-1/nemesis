import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useRiskScores, useGenerateReport, useReports } from "@/hooks/use-risk";
import { useAlerts } from "@/hooks/use-alerts";
import { ShieldAlert, Activity, BarChart2, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { 
  ResponsiveContainer, PolarAngleAxis, PolarGrid, Radar, RadarChart, PolarRadiusAxis,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, Cell
} from 'recharts';

function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    MODERATE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    LOW: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${colors[level?.toUpperCase()] || colors.LOW}`}>
      {level}
    </span>
  );
}

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "hsl(0, 100%, 60%)",
  High: "hsl(30, 100%, 55%)",
  Moderate: "hsl(50, 100%, 55%)",
  Medium: "hsl(50, 100%, 55%)",
  Low: "hsl(120, 70%, 50%)",
};

export default function Risk() {
  const { data: scores, isLoading } = useRiskScores();
  const { data: alerts } = useAlerts();
  const { data: reports, isLoading: reportsLoading } = useReports();
  const generateReport = useGenerateReport();

  const radarData = scores && scores.length > 0 ? [
    { subject: 'Exposure', A: scores[0].exposureSeverity, fullMark: 100 },
    { subject: 'Likelihood', A: scores[0].attackLikelihood, fullMark: 100 },
    { subject: 'Impact', A: scores[0].operationalImpact, fullMark: 100 },
    { subject: 'Overall', A: scores[0].overallScore, fullMark: 100 },
  ] : [];

  const evolutionData = (scores || []).map((s: any) => ({
    date: s.createdAt ? format(new Date(s.createdAt), 'MM/dd HH:mm') : 'N/A',
    score: s.overallScore,
  }));

  const alertFrequency = (() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Moderate: 0, Low: 0 };
    (alerts || []).forEach((a: any) => {
      const sev = a.severity || "Low";
      if (counts[sev] !== undefined) counts[sev]++;
      else counts["Low"]++;
    });
    return Object.entries(counts).map(([name, count]) => ({ name, count, fill: SEVERITY_COLORS[name] || SEVERITY_COLORS.Low }));
  })();

  return (
    <Layout>
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-4 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Activity className="w-8 h-8 text-primary" />
              Risk Posture
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">QUANTIFIED ORGANIZATION VULNERABILITY METRICS</p>
          </div>
          <button
            data-testid="button-generate-executive-report"
            onClick={() => generateReport.mutate({ reportType: "EXECUTIVE_SUMMARY" })}
            disabled={generateReport.isPending}
            className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-6 py-2 font-bold tracking-widest rounded-sm transition-all flex items-center gap-2 uppercase text-sm disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {generateReport.isPending ? "GENERATING..." : "GENERATE REPORT"}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TacticalCard className="lg:col-span-1 p-6 flex flex-col items-center justify-center min-h-[400px]">
             <h3 className="text-sm text-primary font-mono mb-4 w-full text-center border-b border-primary/20 pb-2">GLOBAL RISK VECTOR</h3>
             {isLoading ? (
               <div className="text-primary/50 font-mono animate-pulse">CALCULATING...</div>
             ) : radarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                    <PolarGrid stroke="rgba(0,255,255,0.2)" />
                    <PolarAngleAxis dataKey="subject" tick={{fill: 'rgba(0,255,255,0.8)', fontSize: 12, fontFamily: 'monospace'}} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar name="Risk" dataKey="A" stroke="hsl(0, 100%, 60%)" fill="hsl(0, 100%, 60%)" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
             ) : (
               <div className="text-muted-foreground font-mono">NO DATA</div>
             )}
          </TacticalCard>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-primary" />
              DOMAIN RISK ASSESSMENTS
            </h3>
            
            {isLoading ? (
              <TacticalCard className="p-8 text-center"><span className="text-primary/50 font-mono">LOADING VECTORS...</span></TacticalCard>
            ) : scores?.length === 0 ? (
              <TacticalCard className="p-8 text-center"><span className="text-primary/50 font-mono">NO SCORES EVALUATED</span></TacticalCard>
            ) : (
              scores?.map((score: any) => (
                <TacticalCard key={score.id} variant={score.classification === 'Critical' ? 'danger' : 'default'} className="p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                      <span className="text-[10px] text-muted-foreground font-mono block mb-1">EVALUATION TARGET</span>
                      <span className="text-xl font-bold text-foreground">Domain ID: {score.domainId}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground font-mono block mb-1">CLASSIFICATION</span>
                      <span className={`px-3 py-1 rounded-sm text-sm font-mono font-bold border ${
                        score.classification === 'Critical' ? 'bg-destructive/20 text-destructive border-destructive/50' :
                        score.classification === 'High' ? 'bg-orange-500/20 text-orange-500 border-orange-500/50' :
                        'bg-primary/20 text-primary border-primary/50'
                      }`}>
                        {score.classification.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black/50 p-3 rounded-sm border border-primary/10">
                      <span className="text-[10px] text-muted-foreground font-mono block mb-1 truncate">OVERALL SCORE</span>
                      <span className="text-2xl font-mono text-white">{score.overallScore}/100</span>
                    </div>
                    <div className="bg-black/50 p-3 rounded-sm border border-primary/10">
                      <span className="text-[10px] text-muted-foreground font-mono block mb-1 truncate">EXPOSURE</span>
                      <span className="text-xl font-mono text-primary/80">{score.exposureSeverity}</span>
                    </div>
                    <div className="bg-black/50 p-3 rounded-sm border border-primary/10">
                      <span className="text-[10px] text-muted-foreground font-mono block mb-1 truncate">LIKELIHOOD</span>
                      <span className="text-xl font-mono text-primary/80">{score.attackLikelihood}</span>
                    </div>
                    <div className="bg-black/50 p-3 rounded-sm border border-primary/10">
                      <span className="text-[10px] text-muted-foreground font-mono block mb-1 truncate">IMPACT</span>
                      <span className="text-xl font-mono text-primary/80">{score.operationalImpact}</span>
                    </div>
                  </div>
                </TacticalCard>
              ))
            )}
          </div>
        </div>

        {/* Risk Evolution + Alert Frequency */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TacticalCard className="p-6">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              RISK EVOLUTION
            </h3>
            {evolutionData.length === 0 ? (
              <div className="text-muted-foreground font-mono text-sm text-center py-8">NO HISTORICAL DATA</div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="date" stroke="rgba(0,255,255,0.5)" tick={{ fontFamily: 'monospace', fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="rgba(0,255,255,0.5)" tick={{ fontFamily: 'monospace', fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0,10,20,0.9)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '2px', fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="score" stroke="hsl(0, 100%, 60%)" strokeWidth={2} dot={{ fill: 'hsl(0, 100%, 60%)', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </TacticalCard>

          <TacticalCard className="p-6">
            <h3 className="text-lg mb-4 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary" />
              ALERT FREQUENCY
            </h3>
            {alertFrequency.every(a => a.count === 0) ? (
              <div className="text-muted-foreground font-mono text-sm text-center py-8">NO ALERTS RECORDED</div>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={alertFrequency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(0,255,255,0.5)" tick={{ fontFamily: 'monospace', fontSize: 10 }} />
                    <YAxis stroke="rgba(0,255,255,0.5)" tick={{ fontFamily: 'monospace', fontSize: 10 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0,10,20,0.9)', border: '1px solid rgba(0,255,255,0.3)', borderRadius: '2px', fontFamily: 'monospace' }} />
                    <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                      {alertFrequency.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </TacticalCard>
        </div>

        {/* Reports List */}
        <TacticalCard className="p-6">
          <h3 className="text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            GENERATED REPORTS
          </h3>
          {reportsLoading ? (
            <div className="text-primary/50 font-mono text-sm animate-pulse">LOADING REPORTS...</div>
          ) : !reports || reports.length === 0 ? (
            <div className="text-muted-foreground font-mono text-sm text-center py-4">NO REPORTS GENERATED</div>
          ) : (
            <div className="space-y-2">
              {reports.map((report: any) => (
                <div key={report.id} data-testid={`report-item-${report.id}`} className="bg-black/40 border border-primary/10 p-4 rounded-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Download className="w-4 h-4 text-primary/50 shrink-0" />
                    <span className="font-mono text-sm text-foreground">{report.title}</span>
                    <SeverityBadge level={report.reportType} />
                    {report.riskLevel && <SeverityBadge level={report.riskLevel} />}
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                    {report.createdAt ? format(new Date(report.createdAt), 'yyyy-MM-dd HH:mm') : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </TacticalCard>
      </div>
    </Layout>
  );
}
