import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useRiskScores } from "@/hooks/use-risk";
import { ShieldAlert, Activity, BarChart2 } from "lucide-react";
import { ResponsiveContainer, PolarAngleAxis, PolarGrid, Radar, RadarChart, PolarRadiusAxis } from 'recharts';

export default function Risk() {
  const { data: scores, isLoading } = useRiskScores();

  // Create mock radar data based on the first score if available
  const radarData = scores && scores.length > 0 ? [
    { subject: 'Exposure', A: scores[0].exposureSeverity, fullMark: 100 },
    { subject: 'Likelihood', A: scores[0].attackLikelihood, fullMark: 100 },
    { subject: 'Impact', A: scores[0].operationalImpact, fullMark: 100 },
    { subject: 'Overall', A: scores[0].overallScore, fullMark: 100 },
  ] : [];

  return (
    <Layout>
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Risk Posture
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">QUANTIFIED ORGANIZATION VULNERABILITY METRICS</p>
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
              scores?.map(score => (
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
      </div>
    </Layout>
  );
}
