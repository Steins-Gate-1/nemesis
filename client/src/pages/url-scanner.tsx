import { Layout } from "@/components/layout";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, AlertTriangle, Search, Database, Globe, Zap, ChevronRight, ExternalLink, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UrlScanResult {
  url: string;
  normalizedUrl: string;
  domain: string;
  riskScore: number;
  riskLevel: "SAFE" | "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
  threatType: string | null;
  confidence: number;
  datasetMatch: {
    found: boolean;
    matchType: "exact" | "domain" | null;
    threatCategory: string | null;
    matchCount: number;
  };
  phishingAnalysis: {
    score: number;
    isPhishing: boolean;
    topIndicators: string[];
  };
  features: Record<string, number>;
  indicators: string[];
  timestamp: string;
}

interface DatasetStats {
  maliciousUrlsTotal: number;
  phishingUrls: number;
  malwareUrls: number;
  defacementUrls: number;
  benignUrls: number;
  uniqueDomains: number;
  phishingModelSamples: number;
  phishingModelFeatures: number;
  loaded: boolean;
}

interface TopThreat {
  domain: string;
  count: number;
  types: string[];
}

const RISK_COLORS: Record<string, string> = {
  SAFE: "text-green-400",
  LOW: "text-blue-400",
  MODERATE: "text-yellow-400",
  HIGH: "text-orange-400",
  CRITICAL: "text-red-400",
};

const RISK_BG: Record<string, string> = {
  SAFE: "bg-green-500/20 border-green-500/40",
  LOW: "bg-blue-500/20 border-blue-500/40",
  MODERATE: "bg-yellow-500/20 border-yellow-500/40",
  HIGH: "bg-orange-500/20 border-orange-500/40",
  CRITICAL: "bg-red-500/20 border-red-500/40",
};

const RISK_GLOW: Record<string, string> = {
  SAFE: "shadow-[0_0_20px_rgba(34,197,94,0.3)]",
  LOW: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  MODERATE: "shadow-[0_0_20px_rgba(234,179,8,0.3)]",
  HIGH: "shadow-[0_0_20px_rgba(249,115,22,0.3)]",
  CRITICAL: "shadow-[0_0_20px_rgba(239,68,68,0.5)]",
};

function RiskGauge({ score, level }: { score: number; level: string }) {
  const angle = (score / 100) * 180 - 90;
  const color = level === "CRITICAL" ? "#ef4444" : level === "HIGH" ? "#f97316" : level === "MODERATE" ? "#eab308" : level === "LOW" ? "#3b82f6" : "#22c55e";

  return (
    <div className="flex flex-col items-center" data-testid="risk-gauge">
      <svg viewBox="0 0 200 120" className="w-48 h-28">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="25%" stopColor="#3b82f6" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="75%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="12" strokeLinecap="round" />
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeGrad)" strokeWidth="12" strokeLinecap="round" strokeDasharray={`${(score / 100) * 251.3} 251.3`} />
        <line
          x1="100" y1="100"
          x2={100 + 60 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 60 * Math.sin((angle * Math.PI) / 180)}
          stroke={color} strokeWidth="3" strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill={color} />
        <text x="100" y="85" textAnchor="middle" className="fill-current text-white font-mono text-2xl font-bold">{score}%</text>
      </svg>
      <span className={`font-mono text-sm font-bold tracking-wider ${RISK_COLORS[level]}`}>{level}</span>
    </div>
  );
}

function FeatureBar({ name, value, max }: { name: string; value: number; max: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct > 70 ? "bg-red-500" : pct > 40 ? "bg-yellow-500" : "bg-green-500";
  return (
    <div className="flex items-center gap-2 text-xs font-mono">
      <span className="w-32 text-muted-foreground truncate">{name}</span>
      <div className="flex-1 bg-white/5 h-1.5 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-muted-foreground">{value}</span>
    </div>
  );
}

export default function UrlScannerPage() {
  const [urlInput, setUrlInput] = useState("");
  const [scanResult, setScanResult] = useState<UrlScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<UrlScanResult[]>([]);

  const { data: stats } = useQuery<DatasetStats>({
    queryKey: ["/api/url/stats"],
  });

  const { data: topThreats } = useQuery<TopThreat[]>({
    queryKey: ["/api/url/top-threats"],
  });

  const scanMutation = useMutation({
    mutationFn: async (url: string) => {
      const res = await apiRequest("POST", "/api/url/scan", { url });
      return res.json() as Promise<UrlScanResult>;
    },
    onSuccess: (data) => {
      setScanResult(data);
      setScanHistory((prev) => [data, ...prev].slice(0, 20));
      queryClient.invalidateQueries({ queryKey: ["/api/url/stats"] });
    },
  });

  const handleScan = () => {
    if (!urlInput.trim()) return;
    scanMutation.mutate(urlInput.trim());
  };

  const quickScanExamples = [
    "signin.eby.de.zukruygxctzmmqi.civpro.co.za",
    "facebook.unitedcolleges.net",
    "halkbankparaf-para.com",
    "google.com",
    "http://www.824555.com/app/member/SportOption.php",
  ];

  return (
    <Layout>
      <div className="space-y-6" data-testid="url-scanner-page">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3" data-testid="page-title">
              <Shield className="w-7 h-7 text-primary" />
              URL THREAT INTELLIGENCE SCANNER
            </h1>
            <p className="text-sm text-muted-foreground font-mono mt-1 tracking-wider">
              POWERED BY 651K+ MALICIOUS URL DATABASE &amp; ML PHISHING MODEL
            </p>
          </div>
          {stats?.loaded && (
            <div className="flex gap-4" data-testid="dataset-badges">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-sm">
                <Database className="w-3.5 h-3.5 text-red-400" />
                <span className="font-mono text-xs text-red-400">{stats.maliciousUrlsTotal.toLocaleString()} THREATS</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-sm">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span className="font-mono text-xs text-primary">{stats.phishingModelFeatures} FEATURES</span>
              </div>
            </div>
          )}
        </div>

        {stats?.loaded && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3" data-testid="stats-grid">
            {[
              { label: "TOTAL THREATS", value: stats.maliciousUrlsTotal.toLocaleString(), color: "text-red-400" },
              { label: "PHISHING URLs", value: stats.phishingUrls.toLocaleString(), color: "text-orange-400" },
              { label: "MALWARE URLs", value: stats.malwareUrls.toLocaleString(), color: "text-red-500" },
              { label: "DEFACEMENT", value: stats.defacementUrls.toLocaleString(), color: "text-yellow-400" },
              { label: "UNIQUE DOMAINS", value: stats.uniqueDomains.toLocaleString(), color: "text-primary" },
              { label: "ML FEATURES", value: String(stats.phishingModelFeatures), color: "text-green-400" },
            ].map((s) => (
              <div key={s.label} className="bg-card/80 border border-primary/10 rounded-sm p-3 text-center">
                <div className={`font-mono text-lg font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground tracking-wider uppercase mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-card/80 border border-primary/20 rounded-sm p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScan()}
                placeholder="Enter URL to analyze (e.g., suspicious-login.example.com/verify)"
                className="w-full bg-black/40 border border-primary/20 rounded-sm pl-10 pr-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_10px_rgba(0,255,255,0.1)]"
                data-testid="url-input"
              />
            </div>
            <button
              onClick={handleScan}
              disabled={scanMutation.isPending || !urlInput.trim()}
              className="px-6 py-3 bg-primary/20 border border-primary/40 text-primary font-mono text-sm uppercase tracking-wider rounded-sm hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              data-testid="scan-button"
            >
              <Zap className="w-4 h-4" />
              {scanMutation.isPending ? "SCANNING..." : "ANALYZE"}
            </button>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-[10px] text-muted-foreground font-mono tracking-wider">QUICK SCAN:</span>
            {quickScanExamples.map((example) => (
              <button
                key={example}
                onClick={() => { setUrlInput(example); scanMutation.mutate(example); }}
                className="text-[10px] font-mono text-primary/70 hover:text-primary px-2 py-0.5 bg-primary/5 border border-primary/10 rounded-sm hover:border-primary/30 transition-all truncate max-w-[200px]"
                data-testid={`quick-scan-${example.substring(0, 10)}`}
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {scanResult && (
            <motion.div
              key={scanResult.timestamp}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className={`bg-card/80 border rounded-sm p-6 ${RISK_BG[scanResult.riskLevel]} ${RISK_GLOW[scanResult.riskLevel]}`} data-testid="scan-result">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
                  <RiskGauge score={scanResult.riskScore} level={scanResult.riskLevel} />

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-2">
                      {(scanResult.riskLevel === "CRITICAL" || scanResult.riskLevel === "HIGH") && (
                        <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0 animate-pulse" />
                      )}
                      <div>
                        <h3 className="font-mono text-sm text-foreground break-all" data-testid="result-url">{scanResult.url}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="font-mono text-xs text-muted-foreground">
                            Domain: <span className="text-primary">{scanResult.domain}</span>
                          </span>
                          <span className="font-mono text-xs text-muted-foreground">
                            Confidence: <span className="text-foreground">{scanResult.confidence}%</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {scanResult.threatType && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-red-500/20 border border-red-500/40 rounded-sm font-mono text-xs text-red-400">
                          {scanResult.threatType}
                        </span>
                        {scanResult.datasetMatch.found && (
                          <span className="px-2 py-0.5 bg-orange-500/20 border border-orange-500/40 rounded-sm font-mono text-xs text-orange-400">
                            {scanResult.datasetMatch.matchType?.toUpperCase()} MATCH ({scanResult.datasetMatch.matchCount} records)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="bg-card/80 border border-primary/10 rounded-sm p-4" data-testid="indicators-panel">
                  <h4 className="text-xs font-mono text-primary tracking-wider uppercase mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    THREAT INDICATORS ({scanResult.indicators.length})
                  </h4>
                  {scanResult.indicators.length > 0 ? (
                    <div className="space-y-2">
                      {scanResult.indicators.map((ind, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs font-mono">
                          <ChevronRight className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">{ind}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-green-400">No threat indicators detected</p>
                  )}
                </div>

                <div className="bg-card/80 border border-primary/10 rounded-sm p-4" data-testid="phishing-analysis-panel">
                  <h4 className="text-xs font-mono text-primary tracking-wider uppercase mb-3 flex items-center gap-2">
                    <Globe className="w-3.5 h-3.5" />
                    ML PHISHING ANALYSIS
                  </h4>
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Phishing Score</span>
                      <span className={scanResult.phishingAnalysis.score > 50 ? "text-red-400" : "text-green-400"}>
                        {scanResult.phishingAnalysis.score}%
                      </span>
                    </div>
                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${scanResult.phishingAnalysis.score > 50 ? "bg-red-500" : scanResult.phishingAnalysis.score > 25 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${scanResult.phishingAnalysis.score}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-muted-foreground">Verdict</span>
                      <span className={scanResult.phishingAnalysis.isPhishing ? "text-red-400" : "text-green-400"}>
                        {scanResult.phishingAnalysis.isPhishing ? "LIKELY PHISHING" : "LEGITIMATE"}
                      </span>
                    </div>
                  </div>
                  <h5 className="text-[10px] font-mono text-muted-foreground tracking-wider uppercase mb-2">TOP INDICATORS</h5>
                  <div className="space-y-1">
                    {scanResult.phishingAnalysis.topIndicators.map((ind, i) => (
                      <div key={i} className="text-[11px] font-mono text-muted-foreground">{ind}</div>
                    ))}
                  </div>
                </div>

                <div className="bg-card/80 border border-primary/10 rounded-sm p-4" data-testid="features-panel">
                  <h4 className="text-xs font-mono text-primary tracking-wider uppercase mb-3 flex items-center gap-2">
                    <BarChart3 className="w-3.5 h-3.5" />
                    URL FEATURE EXTRACTION
                  </h4>
                  <div className="space-y-1.5">
                    <FeatureBar name="URL Length" value={scanResult.features.urlLength || 0} max={200} />
                    <FeatureBar name="Hostname Length" value={scanResult.features.hostnameLength || 0} max={60} />
                    <FeatureBar name="Subdomain Level" value={scanResult.features.subdomainLevel || 0} max={5} />
                    <FeatureBar name="Path Depth" value={scanResult.features.pathLevel || 0} max={10} />
                    <FeatureBar name="Num Dots" value={scanResult.features.numDots || 0} max={8} />
                    <FeatureBar name="Numeric Chars" value={scanResult.features.numNumericChars || 0} max={30} />
                    <FeatureBar name="Sensitive Words" value={scanResult.features.numSensitiveWords || 0} max={5} />
                    <FeatureBar name="Query Length" value={scanResult.features.queryLength || 0} max={100} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {topThreats && topThreats.length > 0 && (
            <div className="bg-card/80 border border-primary/10 rounded-sm p-4" data-testid="top-threats-panel">
              <h4 className="text-xs font-mono text-primary tracking-wider uppercase mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                TOP THREATENED DOMAINS (FROM 651K DATASET)
              </h4>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {topThreats.slice(0, 15).map((threat, i) => (
                  <div key={threat.domain} className="flex items-center gap-3 text-xs font-mono py-1 border-b border-white/5 last:border-0">
                    <span className="text-muted-foreground w-6">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 text-foreground truncate">{threat.domain}</span>
                    <span className="text-red-400">{threat.count}</span>
                    <div className="flex gap-1">
                      {threat.types.map((t) => (
                        <span key={t} className={`px-1.5 py-0.5 rounded-sm text-[9px] uppercase ${
                          t === "phishing" ? "bg-orange-500/20 text-orange-400" :
                          t === "malware" ? "bg-red-500/20 text-red-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {scanHistory.length > 0 && (
            <div className="bg-card/80 border border-primary/10 rounded-sm p-4" data-testid="scan-history-panel">
              <h4 className="text-xs font-mono text-primary tracking-wider uppercase mb-3 flex items-center gap-2">
                <Search className="w-3.5 h-3.5" />
                SCAN HISTORY
              </h4>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {scanHistory.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => setScanResult(result)}
                    className="w-full flex items-center gap-3 text-xs font-mono py-1.5 px-2 border-b border-white/5 hover:bg-white/5 transition-all text-left rounded-sm"
                    data-testid={`history-item-${i}`}
                  >
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      result.riskLevel === "CRITICAL" ? "bg-red-500 animate-pulse" :
                      result.riskLevel === "HIGH" ? "bg-orange-500" :
                      result.riskLevel === "MODERATE" ? "bg-yellow-500" :
                      result.riskLevel === "LOW" ? "bg-blue-500" : "bg-green-500"
                    }`} />
                    <span className="flex-1 truncate text-muted-foreground">{result.url}</span>
                    <span className={`${RISK_COLORS[result.riskLevel]} font-bold`}>{result.riskScore}%</span>
                    <span className={`${RISK_COLORS[result.riskLevel]} text-[9px] uppercase`}>{result.riskLevel}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
