import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useMitreMatrix, MitreTechnique, MitreTactic } from "@/hooks/use-mitre";
import { useState } from "react";
import { Grid3X3, Shield, Target, AlertTriangle, ChevronRight, X } from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip
} from "recharts";

function SeverityBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    MODERATE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    LOW: "bg-green-500/20 text-green-400 border-green-500/40",
    NONE: "bg-gray-500/20 text-gray-500 border-gray-500/40",
  };
  return (
    <span data-testid={`badge-severity-${level}`} className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${colors[level] || colors.NONE}`}>
      {level}
    </span>
  );
}

function getTechniqueColor(evidenceCount: number, severity: string): string {
  if (evidenceCount === 0) return "bg-gray-800/60 border-gray-700/40";
  if (severity === "CRITICAL" || evidenceCount >= 5) return "bg-red-500/20 border-red-500/40";
  if (severity === "HIGH" || evidenceCount >= 3) return "bg-orange-500/20 border-orange-500/40";
  return "bg-amber-500/15 border-amber-500/40";
}

function getTechniqueGlow(evidenceCount: number, severity: string): string {
  if (evidenceCount === 0) return "";
  if (severity === "CRITICAL" || evidenceCount >= 5) return "shadow-[0_0_8px_rgba(239,68,68,0.3)]";
  if (severity === "HIGH" || evidenceCount >= 3) return "shadow-[0_0_8px_rgba(249,115,22,0.2)]";
  return "shadow-[0_0_6px_rgba(245,158,11,0.15)]";
}

function getColumnHeaderColor(tactic: MitreTactic): string {
  const totalEvidence = tactic.techniques.reduce((sum, t) => sum + t.evidenceCount, 0);
  if (totalEvidence === 0) return "border-b-gray-600";
  if (totalEvidence >= 6) return "border-b-red-500";
  if (totalEvidence >= 3) return "border-b-orange-500";
  return "border-b-amber-500";
}

export default function AttackMatrix() {
  const { data, isLoading } = useMitreMatrix();
  const [selectedTechnique, setSelectedTechnique] = useState<(MitreTechnique & { tacticName: string }) | null>(null);

  const radarData = (data?.tactics || []).map(t => ({
    tactic: t.tacticName.length > 12 ? t.tacticName.slice(0, 12) + "..." : t.tacticName,
    fullName: t.tacticName,
    coverage: t.techniques.filter(tech => tech.evidenceCount > 0).length,
    total: t.techniques.length,
    evidence: t.techniques.reduce((sum, tech) => sum + tech.evidenceCount, 0),
  }));

  const _maxEvidence = Math.max(...radarData.map(r => r.evidence), 1);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-primary/20 pb-4">
          <div>
            <h1 data-testid="text-page-title" className="text-3xl font-bold flex items-center gap-3">
              <Grid3X3 className="w-8 h-8 text-primary" />
              MITRE ATT&CK MATRIX
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">
              ENTERPRISE ATTACK FRAMEWORK COVERAGE ANALYSIS
            </p>
          </div>
          {data && (
            <SeverityBadge level={data.overallRiskLevel} />
          )}
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TacticalCard className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">TACTICS COVERED</p>
                <h3 data-testid="text-tactics-covered" className="text-3xl font-mono text-foreground">
                  {isLoading ? "..." : data?.totalTacticsActive ?? 0}
                </h3>
              </div>
              <Shield className="w-6 h-6 text-primary/50" />
            </div>
          </TacticalCard>

          <TacticalCard className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">TECHNIQUES MAPPED</p>
                <h3 data-testid="text-techniques-mapped" className="text-3xl font-mono text-foreground">
                  {isLoading ? "..." : data?.totalTechniquesActive ?? 0}
                </h3>
              </div>
              <Target className="w-6 h-6 text-primary/50" />
            </div>
          </TacticalCard>

          <TacticalCard className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">COVERAGE</p>
                <h3 data-testid="text-coverage-pct" className="text-3xl font-mono text-foreground">
                  {isLoading ? "..." : `${data?.coveragePercentage ?? 0}%`}
                </h3>
              </div>
              <Grid3X3 className="w-6 h-6 text-primary/50" />
            </div>
          </TacticalCard>

          <TacticalCard variant={data?.overallRiskLevel === "CRITICAL" || data?.overallRiskLevel === "HIGH" ? "danger" : "default"} className="p-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground mb-1 uppercase tracking-wider">HIGHEST RISK</p>
                <h3 data-testid="text-highest-risk" className="text-sm font-mono text-foreground truncate max-w-[140px]" title={data?.highestRiskTactic}>
                  {isLoading ? "..." : data?.highestRiskTactic ?? "None"}
                </h3>
              </div>
              <AlertTriangle className="w-6 h-6 text-warning/50" />
            </div>
          </TacticalCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TacticalCard className="p-4">
              <h3 className="text-lg mb-4 flex items-center gap-2">
                <Grid3X3 className="w-5 h-5 text-primary" />
                ENTERPRISE MATRIX
              </h3>
              {isLoading ? (
                <div className="flex items-center justify-center h-64 text-primary/50 font-mono text-sm">
                  LOADING MATRIX DATA...
                </div>
              ) : (
                <div className="overflow-x-auto pb-2" data-testid="matrix-grid">
                  <div className="flex gap-1.5" style={{ minWidth: `${(data?.tactics.length || 14) * 140}px` }}>
                    {(data?.tactics || []).map((tactic) => (
                      <div key={tactic.tacticId} className="flex-1 min-w-[130px]" data-testid={`column-tactic-${tactic.tacticId}`}>
                        <div className={`text-center py-2 px-1 bg-black/40 border border-primary/10 border-b-2 ${getColumnHeaderColor(tactic)} mb-1.5 rounded-sm`}>
                          <p className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider truncate" title={tactic.tacticName}>
                            {tactic.tacticName}
                          </p>
                          <p className="text-[8px] font-mono text-primary/40 mt-0.5">{tactic.tacticId}</p>
                        </div>
                        <div className="space-y-1">
                          {tactic.techniques.map((tech) => (
                            <button
                              key={tech.techniqueId}
                              data-testid={`cell-technique-${tech.techniqueId}`}
                              onClick={() => setSelectedTechnique({ ...tech, tacticName: tactic.tacticName })}
                              className={`w-full text-left p-2 border rounded-sm transition-all duration-200 cursor-pointer
                                ${getTechniqueColor(tech.evidenceCount, tech.severity)}
                                ${getTechniqueGlow(tech.evidenceCount, tech.severity)}
                                ${selectedTechnique?.techniqueId === tech.techniqueId ? "ring-1 ring-primary" : ""}
                                hover:brightness-125
                              `}
                            >
                              <p className="text-[9px] font-mono text-foreground/90 leading-tight truncate" title={tech.techniqueName}>
                                {tech.techniqueName}
                              </p>
                              <div className="flex justify-between items-center mt-1 gap-1">
                                <span className="text-[8px] font-mono text-muted-foreground">{tech.techniqueId}</span>
                                {tech.evidenceCount > 0 && (
                                  <span className="text-[8px] font-mono text-primary/70">{tech.evidenceCount}</span>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-primary/10 flex-wrap">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">LEGEND:</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-gray-800/60 border border-gray-700/40 rounded-sm"></div>
                  <span className="text-[10px] font-mono text-muted-foreground">No Evidence</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-amber-500/15 border border-amber-500/40 rounded-sm"></div>
                  <span className="text-[10px] font-mono text-muted-foreground">Some</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-orange-500/20 border border-orange-500/40 rounded-sm"></div>
                  <span className="text-[10px] font-mono text-muted-foreground">High</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-red-500/20 border border-red-500/40 rounded-sm"></div>
                  <span className="text-[10px] font-mono text-muted-foreground">Critical</span>
                </div>
              </div>
            </TacticalCard>
          </div>

          <div className="flex flex-col gap-6">
            <TacticalCard className="p-4">
              <h3 className="text-lg mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                COVERAGE RADAR
              </h3>
              <div className="h-[280px] w-full">
                {!isLoading && radarData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="70%">
                      <PolarGrid stroke="rgba(0, 255, 255, 0.15)" />
                      <PolarAngleAxis
                        dataKey="tactic"
                        tick={{ fill: "rgba(0, 255, 255, 0.6)", fontSize: 8, fontFamily: "monospace" }}
                      />
                      <Radar
                        name="Evidence"
                        dataKey="evidence"
                        stroke="rgba(0, 255, 255, 0.8)"
                        fill="rgba(0, 255, 255, 0.2)"
                        strokeWidth={2}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(0, 10, 20, 0.95)",
                          border: "1px solid rgba(0, 255, 255, 0.3)",
                          borderRadius: "2px",
                          fontFamily: "monospace",
                          fontSize: "11px",
                        }}
                        formatter={(value: number, name: string, entry: any) => {
                          return [
                            `${value} evidence items (${entry.payload.coverage}/${entry.payload.total} techniques)`,
                            entry.payload.fullName,
                          ];
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-primary/50 font-mono text-sm">
                    LOADING RADAR...
                  </div>
                )}
              </div>
            </TacticalCard>

            {selectedTechnique && (
              <TacticalCard className="p-4" data-testid="panel-technique-detail">
                <div className="flex justify-between items-start gap-2 mb-3">
                  <h3 className="text-lg flex items-center gap-2">
                    <ChevronRight className="w-5 h-5 text-primary" />
                    TECHNIQUE DETAIL
                  </h3>
                  <button
                    data-testid="button-close-detail"
                    onClick={() => setSelectedTechnique(null)}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">TECHNIQUE</p>
                    <p data-testid="text-technique-name" className="text-sm font-mono text-foreground">{selectedTechnique.techniqueName}</p>
                    <p className="text-[10px] font-mono text-primary/50 mt-0.5">{selectedTechnique.techniqueId}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">TACTIC</p>
                    <p data-testid="text-technique-tactic" className="text-sm font-mono text-foreground">{selectedTechnique.tacticName}</p>
                  </div>

                  <div>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">DESCRIPTION</p>
                    <p data-testid="text-technique-desc" className="text-xs text-muted-foreground leading-relaxed">{selectedTechnique.description}</p>
                  </div>

                  <div className="flex gap-3 flex-wrap">
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">EVIDENCE</p>
                      <p data-testid="text-technique-evidence" className="text-2xl font-mono text-foreground">{selectedTechnique.evidenceCount}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">SEVERITY</p>
                      <SeverityBadge level={selectedTechnique.severity} />
                    </div>
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">RELEVANCE</p>
                      <SeverityBadge level={selectedTechnique.relevance} />
                    </div>
                  </div>

                  {selectedTechnique.sources.length > 0 && (
                    <div>
                      <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">SOURCES</p>
                      <div className="space-y-1 max-h-[150px] overflow-y-auto">
                        {selectedTechnique.sources.map((source, i) => (
                          <p key={i} data-testid={`text-source-${i}`} className="text-[10px] font-mono text-primary/70 truncate" title={source}>
                            {source}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TacticalCard>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
