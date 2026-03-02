import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { 
  useBreaches, 
  useInfrastructureExposure, 
  useGithubExposure, 
  useAttackScenarios 
} from "@/hooks/use-threats";
import { useState } from "react";
import { format } from "date-fns";
import { Database, Server, Github, Crosshair, ShieldAlert } from "lucide-react";

export default function Threats() {
  const [activeTab, setActiveTab] = useState<"breaches" | "infra" | "github" | "scenarios">("breaches");
  
  const { data: breaches, isLoading: breachesLoading } = useBreaches();
  const { data: infra, isLoading: infraLoading } = useInfrastructureExposure();
  const { data: github, isLoading: githubLoading } = useGithubExposure();
  const { data: scenarios, isLoading: scenariosLoading } = useAttackScenarios();

  const tabs = [
    { id: "breaches", label: "Breach Intel", icon: Database },
    { id: "infra", label: "Infra Exposure", icon: Server },
    { id: "github", label: "Code Leaks", icon: Github },
    { id: "scenarios", label: "Attack Paths", icon: Crosshair },
  ] as const;

  const SeverityBadge = ({ severity }: { severity: string }) => {
    const colors: Record<string, string> = {
      Critical: "bg-destructive/20 text-destructive border-destructive/50",
      High: "bg-orange-500/20 text-orange-500 border-orange-500/50",
      Moderate: "bg-yellow-500/20 text-yellow-500 border-yellow-500/50",
      Low: "bg-primary/20 text-primary border-primary/50"
    };
    return (
      <span className={`px-2 py-1 text-[10px] uppercase font-mono border rounded-sm ${colors[severity] || colors.Low}`}>
        {severity}
      </span>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        <header className="border-b border-primary/20 pb-4">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" />
            Threat Intelligence
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">EXTERNAL FOOTPRINT & VULNERABILITY MAPPING</p>
        </header>

        {/* Tactical Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-primary/10 pb-4">
          {tabs.map(tab => (
            <button
              key={tab.id}
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

        {/* Content Area */}
        <TacticalCard className="min-h-[500px]">
          <div className="overflow-x-auto">
            {activeTab === "breaches" && (
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
                    <tr key={b.id} className="hover:bg-primary/5 transition-colors">
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
            )}

            {activeTab === "infra" && (
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
                    <tr key={i.id} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-bold text-primary">{i.ip}</td>
                      <td className="p-4 text-muted-foreground">
                        {Array.isArray(i.ports) ? i.ports.map(p => <span key={p} className="mr-2 bg-black/50 px-1 rounded">{p}</span>) : '-'}
                      </td>
                      <td className="p-4 text-xs text-muted-foreground max-w-md truncate">
                        {Array.isArray(i.vulnerabilities) ? JSON.stringify(i.vulnerabilities) : '-'}
                      </td>
                      <td className="p-4"><SeverityBadge severity={i.severity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "github" && (
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
                    <tr key={g.id} className="hover:bg-primary/5 transition-colors">
                      <td className="p-4 font-bold text-primary truncate max-w-[200px]">{g.repoUrl}</td>
                      <td className="p-4 text-warning">{g.secretType || 'Unknown'}</td>
                      <td className="p-4 font-mono text-xs bg-black/50 text-muted-foreground p-2 rounded mx-4 my-2 block max-w-md truncate border border-primary/10">
                        {g.snippet || '******'}
                      </td>
                      <td className="p-4"><SeverityBadge severity={g.severity} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === "scenarios" && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {scenariosLoading ? (
                  <div className="col-span-full text-center text-primary/50 py-10 font-mono">COMPILING ATTACK VECTORS...</div>
                ) : scenarios?.length === 0 ? (
                  <div className="col-span-full text-center text-primary/50 py-10 font-mono">NO CRITICAL PATHS IDENTIFIED</div>
                ) : scenarios?.map(s => (
                  <div key={s.id} className="bg-black/40 border border-primary/20 rounded-sm p-5 hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="text-lg text-primary font-bold">{s.title}</h3>
                      <SeverityBadge severity={s.severity} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 font-mono leading-relaxed">
                      {s.description}
                    </p>
                    {Array.isArray(s.mitigationSteps) && s.mitigationSteps.length > 0 && (
                      <div className="mt-4 border-t border-primary/10 pt-4">
                        <h4 className="text-xs text-primary/70 font-mono mb-2">RECOMMENDED MITIGATION:</h4>
                        <ul className="space-y-1">
                          {s.mitigationSteps.map((step, idx) => (
                            <li key={idx} className="text-xs text-muted-foreground font-mono flex gap-2">
                              <span className="text-primary">{'>'}</span> {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </TacticalCard>
      </div>
    </Layout>
  );
}
