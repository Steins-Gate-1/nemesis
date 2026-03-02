import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useAuditLogs, useSearchAuditLogs } from "@/hooks/use-audit";
import { useGenerateReport } from "@/hooks/use-risk";
import { FileTerminal, TerminalSquare, Search, FileText, ChevronDown, ChevronRight, Hash, User, Zap } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

function ActionTypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null;
  const colors: Record<string, string> = {
    SCAN: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    ALERT: "bg-red-500/20 text-red-400 border-red-500/40",
    DEPLOY: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    REPORT: "bg-green-500/20 text-green-400 border-green-500/40",
    CREATE: "bg-cyan-500/20 text-cyan-400 border-cyan-500/40",
    UPDATE: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  };
  const matchedKey = Object.keys(colors).find(k => type.toUpperCase().includes(k));
  const colorClass = matchedKey ? colors[matchedKey] : "bg-primary/10 text-primary/70 border-primary/30";
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${colorClass}`}>
      {type}
    </span>
  );
}

function ActorTypeBadge({ type }: { type: string | null | undefined }) {
  if (!type) return null;
  const isSystem = type.toUpperCase() === "SYSTEM";
  return (
    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-sm border ${isSystem ? 'bg-cyan-500/10 text-cyan-400/70 border-cyan-500/30' : 'bg-orange-500/10 text-orange-400/70 border-orange-500/30'}`}>
      <User className="w-2.5 h-2.5 inline mr-0.5" />
      {type}
    </span>
  );
}

export default function Audit() {
  const { data: logs, isLoading } = useAuditLogs();
  const generateReport = useGenerateReport();
  
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const { data: searchResults, isLoading: searchLoading } = useSearchAuditLogs({
    entity: entityFilter,
    action: actionFilter,
    actor: actorFilter,
  });

  const hasFilters = !!(entityFilter || actionFilter || actorFilter);
  const displayLogs = hasFilters ? (searchResults || []) : (logs || []);

  const toggleExpanded = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <header className="border-b border-primary/20 pb-4 shrink-0 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <FileTerminal className="w-8 h-8 text-primary" />
              System Logs
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1">IMMUTABLE AUDIT TRAIL</p>
          </div>
          <button
            data-testid="button-generate-audit-report"
            onClick={() => generateReport.mutate({ reportType: "EXECUTIVE_SUMMARY" })}
            disabled={generateReport.isPending}
            className="bg-primary/20 hover:bg-primary/40 text-primary border border-primary px-6 py-2 font-bold tracking-widest rounded-sm transition-all flex items-center gap-2 uppercase text-sm disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {generateReport.isPending ? "GENERATING..." : "GENERATE REPORT"}
          </button>
        </header>

        {/* Search/Filter Bar */}
        <TacticalCard className="p-4 shrink-0">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex items-center gap-2 flex-1 w-full">
              <Search className="w-4 h-4 text-primary/50 shrink-0" />
              <div className="flex flex-1 gap-2 flex-wrap">
                <input
                  data-testid="input-entity-filter"
                  type="text"
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  placeholder="Entity filter..."
                  className="bg-black/50 border border-primary/30 text-foreground font-mono px-3 py-2 rounded-sm focus:outline-none focus:border-primary text-sm flex-1 min-w-[120px]"
                />
                <input
                  data-testid="input-action-filter"
                  type="text"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  placeholder="Action filter..."
                  className="bg-black/50 border border-primary/30 text-foreground font-mono px-3 py-2 rounded-sm focus:outline-none focus:border-primary text-sm flex-1 min-w-[120px]"
                />
                <input
                  data-testid="input-actor-filter"
                  type="text"
                  value={actorFilter}
                  onChange={(e) => setActorFilter(e.target.value)}
                  placeholder="Actor filter..."
                  className="bg-black/50 border border-primary/30 text-foreground font-mono px-3 py-2 rounded-sm focus:outline-none focus:border-primary text-sm flex-1 min-w-[120px]"
                />
              </div>
            </div>
            {hasFilters && (
              <span className="text-[10px] font-mono text-primary/60 shrink-0">
                {searchLoading ? "SEARCHING..." : `${displayLogs.length} RESULTS`}
              </span>
            )}
          </div>
        </TacticalCard>

        <TacticalCard className="flex-1 flex flex-col bg-black/90 min-h-[500px]">
          <div className="bg-primary/10 border-b border-primary/30 p-3 flex items-center gap-2 shrink-0">
            <TerminalSquare className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs text-primary">root@nemesis-core:~# tail -f /var/log/audit.log</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1 custom-scrollbar">
            {(isLoading || (hasFilters && searchLoading)) ? (
              <div className="text-primary/50 animate-pulse">Initializing log stream...</div>
            ) : displayLogs.length === 0 ? (
              <div className="text-primary/50">Log file empty.</div>
            ) : (
              displayLogs.map((log: any) => (
                <div key={log.id} data-testid={`log-entry-${log.id}`} className="group">
                  <div 
                    className="flex flex-col sm:flex-row sm:items-center sm:gap-3 hover:bg-white/5 p-1.5 rounded transition-colors border-l-2 border-transparent hover:border-primary/50 cursor-pointer"
                    onClick={() => log.rawEventData && toggleExpanded(log.id)}
                  >
                    <div className="flex items-center gap-2 shrink-0">
                      {log.rawEventData ? (
                        expandedIds.has(log.id) ? <ChevronDown className="w-3 h-3 text-primary/50" /> : <ChevronRight className="w-3 h-3 text-primary/50" />
                      ) : (
                        <span className="w-3" />
                      )}
                      <span className="text-primary/60 w-40 shrink-0">
                        [{log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'UNKNOWN'}]
                      </span>
                    </div>
                    <span className="text-warning shrink-0 w-20 truncate" title={log.user || 'system'}>
                      {log.user || 'system'}
                    </span>
                    <span className="text-white font-bold shrink-0 min-w-[140px]">
                      {log.action}
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <ActionTypeBadge type={log.actionType} />
                      <ActorTypeBadge type={log.actorType} />
                    </div>
                    <span className="text-muted-foreground truncate flex-1" title={log.details || ''}>
                      {log.details ? `-> ${log.details}` : ''}
                    </span>
                    {log.hashSignature && (
                      <span 
                        className="text-[10px] text-primary/40 shrink-0 cursor-help flex items-center gap-0.5"
                        title={log.hashSignature}
                        data-testid={`hash-${log.id}`}
                      >
                        <Hash className="w-2.5 h-2.5" />
                        {log.hashSignature.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                  {expandedIds.has(log.id) && log.rawEventData && (
                    <div className="ml-8 mt-1 mb-2 bg-black/60 border border-primary/10 p-3 rounded-sm">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-3 h-3 text-primary/50" />
                        <span className="text-[10px] text-primary/60">RAW EVENT DATA</span>
                        {log.targetEntity && (
                          <span className="text-[10px] text-muted-foreground">TARGET: {log.targetEntity}</span>
                        )}
                        {log.referenceId && (
                          <span className="text-[10px] text-muted-foreground">REF: {log.referenceId}</span>
                        )}
                      </div>
                      <pre className="text-[11px] text-primary/70 overflow-x-auto whitespace-pre-wrap break-all max-h-[200px] overflow-y-auto custom-scrollbar">
                        {JSON.stringify(log.rawEventData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            )}
            {!isLoading && (
              <div className="flex items-center gap-2 mt-4 text-primary">
                <span className="animate-pulse">_</span>
              </div>
            )}
          </div>
        </TacticalCard>
      </div>
    </Layout>
  );
}
