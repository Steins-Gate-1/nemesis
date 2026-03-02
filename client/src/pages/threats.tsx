import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { 
  useBreaches, 
  useInfrastructureExposure, 
  useGithubExposure, 
  useAttackScenarios,
  useSimulateAttack,
} from "@/hooks/use-threats";
import { useState } from "react";
import { format } from "date-fns";
import { 
  Database, Server, Github, Crosshair, ShieldAlert, Target, Activity,
  ChevronDown, ChevronRight, AlertTriangle, Shield, Zap, Eye, 
  FileText, CheckCircle2, X
} from "lucide-react";

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-500/20 text-red-400 border-red-500/40",
    Critical: "bg-red-500/20 text-red-400 border-red-500/40",
    HIGH: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    High: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    MODERATE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    Moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    MEDIUM: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    LOW: "bg-green-500/20 text-green-400 border-green-500/40",
    Low: "bg-green-500/20 text-green-400 border-green-500/40",
  };
  return (
    <span data-testid={`badge-severity-${severity}`} className={`px-2 py-0.5 text-[10px] uppercase font-mono border rounded-sm ${colors[severity] || colors.LOW}`}>
      {severity}
    </span>
  );
}

function RiskMeter({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "bg-red-500" : score >= 40 ? "bg-orange-500" : score >= 20 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] font-mono text-muted-foreground">{label}</span>
        <span className="text-[10px] font-mono text-foreground">{score}%</span>
      </div>
      <div className="h-1.5 bg-black/60 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
    </div>
  );
}

function ScenarioCard({ scenario, isExpanded, onToggle }: { scenario: any; isExpanded: boolean; onToggle: () => void }) {
  const attackSteps = Array.isArray(scenario.attackSteps) ? scenario.attackSteps : [];
  const conditions = Array.isArray(scenario.requiredConditions) ? scenario.requiredConditions : [];
  const mitigations = Array.isArray(scenario.mitigationSteps) ? scenario.mitigationSteps : [];
  const json = scenario.scenarioJson || scenario;
  const riskExplanation = Array.isArray(json.riskExplanation) ? json.riskExplanation : [];

  return (
    <div data-testid={`card-scenario-${scenario.id}`} className="bg-black/40 border border-primary/20 rounded-sm overflow-hidden hover:border-primary/40 transition-colors">
      <button
        data-testid={`button-toggle-scenario-${scenario.id}`}
        onClick={onToggle}
        className="w-full p-4 flex items-start justify-between gap-3 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Crosshair className="w-4 h-4 text-primary flex-shrink-0" />
            <h3 className="text-sm font-bold text-foreground truncate">{scenario.title}</h3>
            <SeverityBadge severity={scenario.severity} />
          </div>
          <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
            {scenario.entryPoint && <span>ENTRY: {scenario.entryPoint}</span>}
            {scenario.attackCategory && <span>CATEGORY: {scenario.attackCategory}</span>}
            {scenario.riskScore != null && <span>RISK: {scenario.riskScore}</span>}
          </div>
        </div>
        {isExpanded ? <ChevronDown className="w-4 h-4 text-primary flex-shrink-0 mt-1" /> : <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />}
      </button>

      {isExpanded && (
        <div className="border-t border-primary/10 p-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <RiskMeter score={scenario.likelihoodScore || 0} label="LIKELIHOOD" />
            <RiskMeter score={scenario.impactScore || 0} label="IMPACT" />
            <RiskMeter score={scenario.riskScore || 0} label="RISK SCORE" />
          </div>

          {attackSteps.length > 0 && (
            <div>
              <h4 className="text-xs font-mono text-primary/70 mb-2 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> ATTACK CHAIN
              </h4>
              <div className="space-y-1.5 pl-2 border-l border-primary/20">
                {attackSteps.map((step: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-xs font-mono text-muted-foreground">
                    <span className="text-primary/60 flex-shrink-0 w-5 text-right">{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-foreground/80">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {conditions.length > 0 && (
            <div>
              <h4 className="text-xs font-mono text-primary/70 mb-2 flex items-center gap-1.5">
                <Eye className="w-3 h-3" /> REQUIRED CONDITIONS
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {conditions.map((c: string, i: number) => (
                  <span key={i} className="text-[10px] font-mono bg-primary/5 text-primary/80 border border-primary/15 px-2 py-0.5 rounded-sm">{c}</span>
                ))}
              </div>
            </div>
          )}

          {riskExplanation.length > 0 && (
            <div className="bg-red-500/5 border border-red-500/15 rounded-sm p-3">
              <h4 className="text-xs font-mono text-red-400/80 mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" /> WHY RISK IS {scenario.severity}
              </h4>
              <ul className="space-y-1">
                {riskExplanation.map((r: string, i: number) => (
                  <li key={i} className="text-xs font-mono text-red-400/70 flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">•</span> {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mitigations.length > 0 && (
            <div>
              <h4 className="text-xs font-mono text-green-400/80 mb-2 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> RECOMMENDED MITIGATIONS
              </h4>
              <ul className="space-y-1">
                {mitigations.map((m: string, i: number) => (
                  <li key={i} className="text-xs font-mono text-muted-foreground flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-400/60 flex-shrink-0 mt-0.5" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SimulationPanel({ result, onClose }: { result: any; onClose: () => void }) {
  const [expandedScenario, setExpandedScenario] = useState<number>(0);
  const playbook = result.playbook;

  const riskColor = result.overall_risk_level === "CRITICAL" ? "text-red-400" 
    : result.overall_risk_level === "HIGH" ? "text-orange-400"
    : result.overall_risk_level === "MODERATE" ? "text-yellow-400" 
    : "text-green-400";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          ATTACK SIMULATION RESULTS
        </h3>
        <button data-testid="button-close-simulation" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <TacticalCard variant={result.overall_risk_level === "CRITICAL" ? "danger" : "default"} className="p-4 text-center">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">OVERALL RISK</p>
          <p data-testid="text-overall-risk" className={`text-3xl font-mono font-bold ${riskColor}`}>{result.overall_risk_score}</p>
          <SeverityBadge severity={result.overall_risk_level} />
        </TacticalCard>
        <TacticalCard className="p-4 text-center">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">SCENARIOS</p>
          <p data-testid="text-scenario-count" className="text-3xl font-mono font-bold text-foreground">{result.attack_scenarios.length}</p>
          <p className="text-[10px] font-mono text-muted-foreground">IDENTIFIED</p>
        </TacticalCard>
        <TacticalCard className="p-4 text-center">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">HIGHEST RISK</p>
          <p className="text-3xl font-mono font-bold text-foreground">{result.highest_risk_scenario?.riskScore || 0}</p>
          <p className="text-[10px] font-mono text-muted-foreground truncate">{result.highest_risk_scenario?.title || "N/A"}</p>
        </TacticalCard>
        <TacticalCard className="p-4 text-center">
          <p className="text-[10px] font-mono text-muted-foreground mb-1">VECTORS</p>
          <p className="text-3xl font-mono font-bold text-foreground">
            {[...new Set(result.attack_scenarios.map((s: any) => s.attackCategory))].length}
          </p>
          <p className="text-[10px] font-mono text-muted-foreground">CATEGORIES</p>
        </TacticalCard>
      </div>

      {playbook && (
        <TacticalCard variant="highlight" className="p-5 space-y-4">
          <h4 className="text-sm font-bold flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            AI TACTICAL PLAYBOOK
          </h4>
          
          {playbook.executiveSummary && (
            <div>
              <p className="text-[10px] font-mono text-primary/60 mb-1">EXECUTIVE SUMMARY</p>
              <p data-testid="text-executive-summary" className="text-sm text-foreground/90 leading-relaxed">{playbook.executiveSummary}</p>
            </div>
          )}

          {playbook.tacticalBrief && (
            <div>
              <p className="text-[10px] font-mono text-primary/60 mb-1">TACTICAL BRIEF</p>
              <p data-testid="text-tactical-brief" className="text-sm text-muted-foreground leading-relaxed">{playbook.tacticalBrief}</p>
            </div>
          )}

          {playbook.mitigationChecklist?.length > 0 && (
            <div>
              <p className="text-[10px] font-mono text-primary/60 mb-2">PRIORITY MITIGATION CHECKLIST</p>
              <ul className="space-y-1.5">
                {playbook.mitigationChecklist.map((item: string, i: number) => (
                  <li key={i} className="text-xs font-mono text-muted-foreground flex items-start gap-2">
                    <span className="text-primary w-4 text-right flex-shrink-0">{i + 1}.</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {playbook.confidenceExplanation && (
            <div className="text-[10px] font-mono text-muted-foreground/60 border-t border-primary/10 pt-2">
              CONFIDENCE: {playbook.confidenceExplanation}
            </div>
          )}
        </TacticalCard>
      )}

      <div className="space-y-2">
        <h4 className="text-sm font-bold font-mono text-primary/80">ATTACK SCENARIOS ({result.attack_scenarios.length})</h4>
        {result.attack_scenarios.map((s: any, i: number) => (
          <ScenarioCard
            key={s.scenarioId || i}
            scenario={{
              ...s,
              id: s.scenarioId || i,
              attackSteps: s.attackSteps,
              requiredConditions: s.requiredConditions,
              mitigationSteps: s.recommendedMitigations,
              scenarioJson: s,
            }}
            isExpanded={expandedScenario === i}
            onToggle={() => setExpandedScenario(expandedScenario === i ? -1 : i)}
          />
        ))}
      </div>

      {result.risk_explanation && (
        <div className="bg-black/40 border border-primary/10 rounded-sm p-4">
          <h4 className="text-xs font-mono text-primary/70 mb-2">RISK ANALYSIS SUMMARY</h4>
          <p data-testid="text-risk-explanation" className="text-xs font-mono text-muted-foreground leading-relaxed">{result.risk_explanation}</p>
        </div>
      )}
    </div>
  );
}

export default function Threats() {
  const [activeTab, setActiveTab] = useState<"breaches" | "infra" | "github" | "scenarios" | "simulate">("scenarios");
  
  const { data: breaches, isLoading: breachesLoading } = useBreaches();
  const { data: infra, isLoading: infraLoading } = useInfrastructureExposure();
  const { data: github, isLoading: githubLoading } = useGithubExposure();
  const { data: scenarios, isLoading: scenariosLoading } = useAttackScenarios();
  const simulate = useSimulateAttack();

  const [simDomain, setSimDomain] = useState("");
  const [simResult, setSimResult] = useState<any>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simDomain) return;
    simulate.mutate(simDomain, {
      onSuccess: (data: any) => {
        setSimResult(data);
      },
    });
  };

  const tabs = [
    { id: "simulate", label: "Attack Sim", icon: Target },
    { id: "scenarios", label: "Stored Scenarios", icon: Crosshair },
    { id: "breaches", label: "Breach Intel", icon: Database },
    { id: "infra", label: "Infra Exposure", icon: Server },
    { id: "github", label: "Code Leaks", icon: Github },
  ] as const;

  return (
    <Layout>
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-4">
          <h1 data-testid="text-page-title" className="text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" />
            Threat Intelligence
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">ATTACK SIMULATION & RISK INTELLIGENCE ENGINE</p>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-primary/10 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
              data-testid={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 font-mono text-sm uppercase tracking-wider rounded-t-sm border-b-2 transition-all
                ${activeTab === tab.id 
                  ? "bg-primary/10 text-primary border-primary" 
                  : "text-muted-foreground hover:bg-white/5 border-transparent"
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "simulate" && (
          <div className="space-y-4">
            <TacticalCard className="p-6">
              <h3 className="text-sm font-bold font-mono mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                ATTACK SIMULATION ENGINE
              </h3>
              <p className="text-xs text-muted-foreground font-mono mb-4">
                Enter a domain to run full OSINT analysis, generate deterministic attack paths, calculate risk scores, and produce AI tactical playbooks.
              </p>
              <form onSubmit={handleSimulate} className="flex gap-2">
                <input
                  data-testid="input-sim-domain"
                  type="text"
                  value={simDomain}
                  onChange={(e) => setSimDomain(e.target.value)}
                  placeholder="example.com"
                  className="flex-1 bg-black/50 border border-primary/30 text-foreground font-mono px-4 py-2 rounded-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50"
                />
                <button
                  data-testid="button-simulate"
                  type="submit"
                  disabled={simulate.isPending}
                  className="bg-red-500/20 hover:bg-red-500/40 text-red-400 border border-red-500/50 px-6 py-2 font-bold tracking-widest rounded-sm transition-all flex items-center gap-2 uppercase text-sm disabled:opacity-50"
                >
                  {simulate.isPending ? <Activity className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
                  {simulate.isPending ? "SIMULATING" : "SIMULATE ATTACK"}
                </button>
              </form>

              {simulate.isError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-sm font-mono text-sm">
                  ERROR: {simulate.error?.message || "Simulation failed"}
                </div>
              )}
            </TacticalCard>

            {simResult && (
              <SimulationPanel result={simResult} onClose={() => setSimResult(null)} />
            )}
          </div>
        )}

        {activeTab === "scenarios" && (
          <TacticalCard className="min-h-[400px]">
            <div className="p-4 border-b border-primary/10 bg-primary/5">
              <h3 className="text-sm font-bold font-mono flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-primary" />
                STORED ATTACK SCENARIOS
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-sm">{scenarios?.length || 0} RECORDS</span>
              </h3>
            </div>
            <div className="p-4 space-y-2">
              {scenariosLoading ? (
                <div className="text-center text-primary/50 py-10 font-mono text-sm">COMPILING ATTACK VECTORS...</div>
              ) : scenarios?.length === 0 ? (
                <div className="text-center text-primary/50 py-10 font-mono text-sm">NO SCENARIOS STORED — RUN AN ATTACK SIMULATION FIRST</div>
              ) : scenarios?.map(s => (
                <ScenarioCard
                  key={s.id}
                  scenario={s}
                  isExpanded={expandedId === s.id}
                  onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
                />
              ))}
            </div>
          </TacticalCard>
        )}

        {activeTab === "breaches" && (
          <TacticalCard className="min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-sm">
                <thead className="bg-primary/5 border-b border-primary/20 text-primary/70">
                  <tr>
                    <th className="p-4 font-normal">TITLE</th>
                    <th className="p-4 font-normal">DOMAIN</th>
                    <th className="p-4 font-normal">DATE</th>
                    <th className="p-4 font-normal">SEVERITY</th>
                    <th className="p-4 font-normal">COMPROMISED DATA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {breachesLoading ? (
                    <tr><td colSpan={5} className="p-8 text-center text-primary/50">ACCESSING RECORDS...</td></tr>
                  ) : breaches?.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-primary/50">NO BREACH RECORDS FOUND</td></tr>
                  ) : breaches?.map(b => (
                    <tr key={b.id} data-testid={`row-breach-${b.id}`} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-bold text-foreground/90">{b.title}</td>
                      <td className="p-4 text-primary/80">{b.domain || '-'}</td>
                      <td className="p-4 text-muted-foreground">{b.breachDate ? format(new Date(b.breachDate), 'yyyy-MM-dd') : 'UNKNOWN'}</td>
                      <td className="p-4"><SeverityBadge severity={b.severity} /></td>
                      <td className="p-4 text-xs text-muted-foreground">
                        {Array.isArray(b.dataClasses) ? b.dataClasses.join(", ") : "Various"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TacticalCard>
        )}

        {activeTab === "infra" && (
          <TacticalCard className="min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-sm">
                <thead className="bg-primary/5 border-b border-primary/20 text-primary/70">
                  <tr>
                    <th className="p-4 font-normal">IP ADDRESS</th>
                    <th className="p-4 font-normal">OPEN PORTS</th>
                    <th className="p-4 font-normal">VULNERABILITIES</th>
                    <th className="p-4 font-normal">SEVERITY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {infraLoading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-primary/50">SCANNING INFRASTRUCTURE...</td></tr>
                  ) : infra?.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-primary/50">NO EXPOSURES FOUND</td></tr>
                  ) : infra?.map(i => (
                    <tr key={i.id} data-testid={`row-infra-${i.id}`} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-bold text-primary">{i.ip}</td>
                      <td className="p-4 text-muted-foreground">
                        {Array.isArray(i.ports) ? i.ports.map((p: any) => <span key={p} className="mr-2 bg-black/50 px-1 rounded">{p}</span>) : '-'}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground max-w-md truncate">
                        {Array.isArray(i.vulnerabilities) ? JSON.stringify(i.vulnerabilities) : '-'}
                      </td>
                      <td className="p-4"><SeverityBadge severity={i.severity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TacticalCard>
        )}

        {activeTab === "github" && (
          <TacticalCard className="min-h-[400px]">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-sm">
                <thead className="bg-primary/5 border-b border-primary/20 text-primary/70">
                  <tr>
                    <th className="p-4 font-normal">REPOSITORY</th>
                    <th className="p-4 font-normal">SECRET TYPE</th>
                    <th className="p-4 font-normal">SNIPPET</th>
                    <th className="p-4 font-normal">SEVERITY</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {githubLoading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-primary/50">ANALYZING CODEBASES...</td></tr>
                  ) : github?.length === 0 ? (
                    <tr><td colSpan={4} className="p-8 text-center text-primary/50">NO LEAKS DETECTED</td></tr>
                  ) : github?.map(g => (
                    <tr key={g.id} data-testid={`row-github-${g.id}`} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-bold text-primary truncate max-w-[200px]">{g.repoUrl}</td>
                      <td className="p-4 text-yellow-400">{g.secretType || 'Unknown'}</td>
                      <td className="p-4">
                        <code className="font-mono text-xs bg-black/50 text-muted-foreground p-2 rounded border border-primary/10 block max-w-md truncate">
                          {g.snippet || '******'}
                        </code>
                      </td>
                      <td className="p-4"><SeverityBadge severity={g.severity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TacticalCard>
        )}
      </div>
    </Layout>
  );
}
