import { Layout } from "@/components/layout";
import { TacticalCard } from "@/components/ui/tactical-card";
import { useAuditLogs } from "@/hooks/use-audit";
import { FileTerminal, TerminalSquare } from "lucide-react";
import { format } from "date-fns";

export default function Audit() {
  const { data: logs, isLoading } = useAuditLogs();

  return (
    <Layout>
      <div className="space-y-6 h-full flex flex-col">
        <header className="border-b border-primary/20 pb-4 shrink-0">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileTerminal className="w-8 h-8 text-primary" />
            System Logs
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">IMMUTABLE AUDIT TRAIL</p>
        </header>

        <TacticalCard className="flex-1 flex flex-col bg-black/90 min-h-[500px]">
          <div className="bg-primary/10 border-b border-primary/30 p-3 flex items-center gap-2 shrink-0">
            <TerminalSquare className="w-4 h-4 text-primary" />
            <span className="font-mono text-xs text-primary">root@nemesis-core:~# tail -f /var/log/audit.log</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-2 custom-scrollbar">
            {isLoading ? (
              <div className="text-primary/50 animate-pulse">Initializing log stream...</div>
            ) : logs?.length === 0 ? (
              <div className="text-primary/50">Log file empty.</div>
            ) : (
              logs?.map((log, i) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:gap-4 group hover:bg-white/5 p-1 rounded transition-colors border-l-2 border-transparent hover:border-primary/50">
                  <span className="text-primary/60 shrink-0 w-44">
                    [{log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss') : 'UNKNOWN'}]
                  </span>
                  <span className="text-warning shrink-0 w-24">
                    {log.user || 'system'}
                  </span>
                  <span className="text-white font-bold shrink-0 min-w-[150px]">
                    {log.action}
                  </span>
                  <span className="text-muted-foreground truncate" title={log.details || ''}>
                    {log.details ? `-> ${log.details}` : ''}
                  </span>
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
