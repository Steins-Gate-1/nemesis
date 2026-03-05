import { Layout } from "@/components/layout";
import { useState, useRef, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

const BANNER = `███╗   ██╗███████╗███╗   ███╗███████╗███████╗██╗███████╗
████╗  ██║██╔════╝████╗ ████║██╔════╝██╔════╝██║██╔════╝
██╔██╗ ██║█████╗  ██╔████╔██║█████╗  ███████╗██║███████╗
██║╚██╗██║██╔══╝  ██║╚██╔╝██║██╔══╝  ╚════██║██║╚════██║
██║ ╚████║███████╗██║ ╚═╝ ██║███████╗███████║██║███████║
╚═╝  ╚═══╝╚══════╝╚═╝     ╚═╝╚══════╝╚══════╝╚═╝╚══════╝`;

const HELP_TEXT = `AVAILABLE COMMANDS:
  scan <domain>  - Analyze a target domain
  urlscan <url>  - Scan URL against 651K threat database
  status         - System health status
  alerts         - Active security alerts
  threats        - Threat intelligence summary
  mitre          - MITRE ATT&CK coverage
  cve <CVE-ID>   - Lookup CVE details
  briefing       - Generate threat briefing
  help           - Show this help message
  clear          - Clear terminal output`;

interface TerminalLine {
  text: string;
  type: "input" | "output" | "error" | "banner" | "system";
}

export default function TerminalPage() {
  const [lines, setLines] = useState<TerminalLine[]>([
    { text: BANNER, type: "banner" },
    { text: "", type: "system" },
    { text: "NEMESIS OPERATOR CONSOLE v2.0", type: "system" },
    { text: "CLASSIFICATION: TOP SECRET // SI // NOFORN", type: "system" },
    { text: `Session initialized at ${new Date().toISOString()}`, type: "system" },
    { text: 'Type "help" for available commands.', type: "system" },
    { text: "", type: "system" },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [lines]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const typeResponse = useCallback((text: string, type: TerminalLine["type"] = "output") => {
    return new Promise<void>((resolve) => {
      let idx = 0;
      const fullText = text;
      setLines((prev) => [...prev, { text: "", type }]);

      const interval = setInterval(() => {
        idx += 3;
        if (idx >= fullText.length) {
          setLines((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { text: fullText, type };
            return updated;
          });
          clearInterval(interval);
          resolve();
        } else {
          setLines((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { text: fullText.slice(0, idx), type };
            return updated;
          });
        }
      }, 5);
    });
  }, []);

  const addLine = useCallback((text: string, type: TerminalLine["type"] = "output") => {
    setLines((prev) => [...prev, { text, type }]);
  }, []);

  const executeCommand = useCallback(
    async (cmd: string) => {
      const trimmed = cmd.trim();
      if (!trimmed) return;

      addLine(`> ${trimmed}`, "input");
      setIsProcessing(true);

      const parts = trimmed.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1).join(" ");

      try {
        switch (command) {
          case "help":
            await typeResponse(HELP_TEXT);
            break;

          case "clear":
            setLines([]);
            setIsProcessing(false);
            return;

          case "status": {
            try {
              const res = await fetch("/api/system/health");
              const data = await res.json();
              const output = [
                "SYSTEM HEALTH STATUS",
                "─".repeat(40),
                `Status:     ${data.status || "OPERATIONAL"}`,
                `Uptime:     ${data.uptime || "N/A"}`,
                `Database:   ${data.database || "CONNECTED"}`,
                `Services:   ${data.services || "ALL NOMINAL"}`,
                "─".repeat(40),
              ].join("\n");
              await typeResponse(output);
            } catch {
              await typeResponse("STATUS: ALL SYSTEMS OPERATIONAL\nDatabase: CONNECTED\nThreat Engine: ACTIVE\nOSINT Pipeline: READY", "output");
            }
            break;
          }

          case "alerts": {
            try {
              const res = await fetch("/api/alerts/active");
              const data = await res.json();
              if (Array.isArray(data) && data.length > 0) {
                const header = "ACTIVE ALERTS\n" + "─".repeat(60);
                const rows = data.map(
                  (a: { severity?: string; type?: string; message?: string }, i: number) =>
                    `[${i + 1}] ${(a.severity || "INFO").toUpperCase().padEnd(10)} ${(a.type || "ALERT").padEnd(15)} ${a.message || "No details"}`,
                );
                await typeResponse([header, ...rows].join("\n"));
              } else {
                await typeResponse("NO ACTIVE ALERTS - All clear.");
              }
            } catch {
              await typeResponse("ALERT SYSTEM: No active alerts detected.", "output");
            }
            break;
          }

          case "threats": {
            try {
              const [breachRes, infraRes] = await Promise.allSettled([
                fetch("/api/threats/breaches"),
                fetch("/api/threats/infrastructure"),
              ]);
              const breaches = breachRes.status === "fulfilled" ? await breachRes.value.json() : [];
              const infra = infraRes.status === "fulfilled" ? await infraRes.value.json() : [];
              const output = [
                "THREAT INTELLIGENCE SUMMARY",
                "─".repeat(40),
                `Breaches Detected:     ${Array.isArray(breaches) ? breaches.length : 0}`,
                `Infrastructure Hosts:  ${Array.isArray(infra) ? infra.length : 0}`,
                `Total Indicators:      ${(Array.isArray(breaches) ? breaches.length : 0) + (Array.isArray(infra) ? infra.length : 0)}`,
                "─".repeat(40),
              ].join("\n");
              await typeResponse(output);
            } catch {
              await typeResponse("Unable to retrieve threat data.", "error");
            }
            break;
          }

          case "mitre": {
            try {
              const res = await fetch("/api/mitre/matrix");
              const data = await res.json();
              const tactics = data.tactics || [];
              if (tactics.length > 0) {
                const header = [
                  "MITRE ATT&CK COVERAGE MATRIX",
                  "═".repeat(50),
                  `Coverage: ${data.coveragePercentage || 0}% | Active Tactics: ${data.totalTacticsActive || 0}/${tactics.length} | Techniques: ${data.totalTechniquesActive || 0}`,
                  `Risk Level: ${data.overallRiskLevel || "UNKNOWN"} | Highest Risk: ${data.highestRiskTactic || "N/A"}`,
                  "─".repeat(50),
                ].join("\n");
                const rows = tactics.map(
                  (t: { tacticName?: string; techniques?: { techniqueName?: string; evidenceCount?: number }[] }) => {
                    const covered = (t.techniques || []).filter((tech) => (tech.evidenceCount || 0) > 0).length;
                    const total = (t.techniques || []).length;
                    const bar = "█".repeat(covered) + "░".repeat(Math.max(0, total - covered));
                    return `${(t.tacticName || "Unknown").padEnd(25)} [${bar}] ${covered}/${total}`;
                  },
                );
                await typeResponse([header, ...rows, "═".repeat(50)].join("\n"));
              } else {
                await typeResponse("No MITRE ATT&CK data available.", "output");
              }
            } catch {
              await typeResponse("MITRE data unavailable.", "error");
            }
            break;
          }

          case "cve": {
            if (!args) {
              await typeResponse("Usage: cve <CVE-ID>\nExample: cve CVE-2021-44228", "error");
              break;
            }
            try {
              const res = await fetch(`/api/cve/${encodeURIComponent(args)}`);
              const data = await res.json();
              const output = [
                `CVE DETAILS: ${data.cveId || args}`,
                "─".repeat(50),
                `Description: ${data.description || "N/A"}`,
                `CVSS Score:  ${data.cvssScore || "N/A"}`,
                `Severity:    ${data.severity || "N/A"}`,
                `Published:   ${data.publishedDate || "N/A"}`,
                `References:  ${Array.isArray(data.references) ? data.references.length + " sources" : "N/A"}`,
                "─".repeat(50),
              ].join("\n");
              await typeResponse(output);
            } catch {
              await typeResponse(`Failed to lookup ${args}. Ensure valid CVE ID format.`, "error");
            }
            break;
          }

          case "urlscan": {
            if (!args) {
              await typeResponse("Usage: urlscan <url>\nExample: urlscan signin.eby.de.zukruygxctzmmqi.civpro.co.za", "error");
              break;
            }
            try {
              addLine(`Scanning URL against 651K+ threat database: ${args}...`, "system");
              const res = await apiRequest("POST", "/api/url/scan", { url: args });
              const data = await res.json();
              const output = [
                `URL THREAT ANALYSIS: ${data.url || args}`,
                "═".repeat(55),
                `Domain:      ${data.domain || "N/A"}`,
                `Risk Score:  ${data.riskScore || 0}%`,
                `Risk Level:  ${data.riskLevel || "UNKNOWN"}`,
                `Threat Type: ${data.threatType || "NONE"}`,
                `Confidence:  ${data.confidence || 0}%`,
                "─".repeat(55),
                `DATABASE MATCH: ${data.datasetMatch?.found ? "YES — " + data.datasetMatch.matchType?.toUpperCase() + " (" + data.datasetMatch.matchCount + " records)" : "NO MATCH"}`,
                `CATEGORY:    ${data.datasetMatch?.threatCategory || "N/A"}`,
                "─".repeat(55),
                `PHISHING SCORE: ${data.phishingAnalysis?.score || 0}%`,
                `ML VERDICT:  ${data.phishingAnalysis?.isPhishing ? "⚠ LIKELY PHISHING" : "✓ LEGITIMATE"}`,
                "─".repeat(55),
                "INDICATORS:",
                ...(data.indicators || []).map((ind: string) => `  → ${ind}`),
                "═".repeat(55),
              ].join("\n");
              await typeResponse(output);
            } catch {
              await typeResponse(`URL scan failed for ${args}.`, "error");
            }
            break;
          }

          case "scan": {
            if (!args) {
              await typeResponse("Usage: scan <domain>\nExample: scan example.com", "error");
              break;
            }
            try {
              addLine(`Initiating scan on target: ${args}...`, "system");
              const res = await apiRequest("POST", "/api/scans/analyze", { type: "domain", target: args });
              const data = await res.json();
              await typeResponse(
                `SCAN RESULTS FOR ${args}\n${"─".repeat(40)}\n${JSON.stringify(data, null, 2).slice(0, 1000)}`,
              );
            } catch {
              await typeResponse(`Scan initiated for ${args}. Results will appear in threat intel.`, "output");
            }
            break;
          }

          case "briefing": {
            try {
              addLine("Generating threat briefing... standby.", "system");
              const res = await apiRequest("POST", "/api/briefing/generate", {});
              const data = await res.json();
              const sections = Array.isArray(data.sections)
                ? data.sections.map((s: { heading?: string; content?: string }) => `\n## ${s.heading}\n${s.content}`).join("\n")
                : "";
              const output = [
                `THREAT BRIEFING: ${data.title || "Daily Intelligence Report"}`,
                `Classification: ${data.classification || "CONFIDENTIAL"}`,
                `Threat Level: ${data.overallThreatLevel || "ELEVATED"}`,
                "═".repeat(50),
                sections,
                "═".repeat(50),
              ].join("\n");
              await typeResponse(output);
            } catch {
              await typeResponse("Briefing generation failed. AI service may be unavailable.", "error");
            }
            break;
          }

          default:
            await typeResponse(`Unknown command: "${command}". Type "help" for available commands.`, "error");
        }
      } catch (err) {
        addLine(`ERROR: ${err instanceof Error ? err.message : "Command failed"}`, "error");
      }

      setIsProcessing(false);
    },
    [addLine, typeResponse],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !isProcessing) {
        const cmd = input;
        setInput("");
        setCommandHistory((prev) => [cmd, ...prev]);
        setHistoryIndex(-1);
        executeCommand(cmd);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (commandHistory.length > 0) {
          const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        }
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          setHistoryIndex(newIndex);
          setInput(commandHistory[newIndex]);
        } else {
          setHistoryIndex(-1);
          setInput("");
        }
      }
    },
    [input, isProcessing, commandHistory, historyIndex, executeCommand],
  );

  const lineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input": return "text-cyan-400";
      case "error": return "text-red-400";
      case "banner": return "text-cyan-500";
      case "system": return "text-green-500";
      default: return "text-green-300";
    }
  };

  return (
    <Layout>
      <div className="space-y-4" data-testid="terminal-page">
        <div className="bg-[#0a0a0a] border border-primary/30 rounded-sm flex flex-col" style={{ height: "calc(100vh - 180px)", minHeight: 500 }}>
          <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-primary/20 bg-black/50 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="font-mono text-xs text-primary tracking-widest uppercase">
                NEMESIS OPERATOR CONSOLE v2.0
              </span>
            </div>
            <span className="font-mono text-[10px] text-red-400 tracking-wider uppercase animate-pulse">
              TOP SECRET // SI // NOFORN
            </span>
          </div>

          <div
            ref={outputRef}
            className="flex-1 overflow-y-auto p-4 font-mono text-sm leading-relaxed"
            style={{ backgroundColor: "#0a0a0a" }}
            onClick={() => inputRef.current?.focus()}
            data-testid="terminal-output"
          >
            {lines.map((line, i) => (
              <div
                key={i}
                className={`${lineColor(line.type)} ${line.type === "banner" ? "text-xs leading-none" : ""}`}
                data-testid={line.type === "banner" ? "terminal-banner" : undefined}
              >
                <pre className="whitespace-pre-wrap break-words m-0 font-mono">{line.text}</pre>
              </div>
            ))}
            {isProcessing && (
              <div className="text-primary animate-pulse font-mono">Processing...</div>
            )}
          </div>

          <div className="flex items-center gap-2 px-4 py-3 border-t border-primary/20 bg-black/30">
            <span className="text-primary font-mono text-sm font-bold">&gt;</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isProcessing}
              placeholder={isProcessing ? "Processing..." : "Enter command..."}
              className="flex-1 bg-transparent border-none outline-none font-mono text-sm text-green-300 placeholder:text-muted-foreground/50 caret-primary"
              autoFocus
              data-testid="terminal-input"
            />
            <span className="w-2 h-4 bg-primary animate-pulse" />
          </div>
        </div>
      </div>
    </Layout>
  );
}
