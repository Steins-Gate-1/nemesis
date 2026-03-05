import { Layout } from "@/components/layout";
import { useThreatMapData, GeoThreatPoint } from "@/hooks/use-threat-map";
import { useState, useMemo } from "react";
import { Globe, Crosshair } from "lucide-react";

function geoToSvg(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng + 180) / 360) * 1000;
  const y = ((90 - lat) / 180) * 500;
  return { x, y };
}

const WORLD_PATHS = [
  "M 130 95 L 145 85 L 155 80 L 170 75 L 190 72 L 210 75 L 225 80 L 235 90 L 240 100 L 250 95 L 260 100 L 275 95 L 285 100 L 295 110 L 300 120 L 295 135 L 285 145 L 275 150 L 265 155 L 255 160 L 240 165 L 230 170 L 215 175 L 205 170 L 195 165 L 185 170 L 175 175 L 165 180 L 155 178 L 150 170 L 145 160 L 140 150 L 135 140 L 130 130 L 125 120 L 120 110 L 125 100 Z",
  "M 270 180 L 280 175 L 290 178 L 300 185 L 305 195 L 310 210 L 308 225 L 305 240 L 300 255 L 295 270 L 288 280 L 280 290 L 275 300 L 270 310 L 265 320 L 258 330 L 252 335 L 248 325 L 245 310 L 242 295 L 240 280 L 242 265 L 245 250 L 248 235 L 252 220 L 255 210 L 258 200 L 262 190 Z",
  "M 440 70 L 455 65 L 470 60 L 485 62 L 500 65 L 515 68 L 520 75 L 525 85 L 528 95 L 530 105 L 525 115 L 518 120 L 510 125 L 500 128 L 490 130 L 480 132 L 470 135 L 460 138 L 450 140 L 440 138 L 432 132 L 425 125 L 420 118 L 418 110 L 420 100 L 425 90 L 430 82 L 435 75 Z",
  "M 450 145 L 465 140 L 480 138 L 500 140 L 510 145 L 520 150 L 530 155 L 540 160 L 545 170 L 548 180 L 550 195 L 545 210 L 540 225 L 535 240 L 530 250 L 522 260 L 510 265 L 498 260 L 488 252 L 478 245 L 468 240 L 460 235 L 452 225 L 448 215 L 445 200 L 442 185 L 440 170 L 442 158 L 445 150 Z",
  "M 550 70 L 580 55 L 620 48 L 660 45 L 700 48 L 740 55 L 770 60 L 800 65 L 820 75 L 830 90 L 835 105 L 830 115 L 820 125 L 800 135 L 780 142 L 760 148 L 740 155 L 720 160 L 700 165 L 680 168 L 660 170 L 640 172 L 620 175 L 600 178 L 580 175 L 560 170 L 545 160 L 538 148 L 535 135 L 538 120 L 542 108 L 545 95 L 548 82 Z",
  "M 780 310 L 800 305 L 820 310 L 835 318 L 845 330 L 848 345 L 842 358 L 830 365 L 815 368 L 800 365 L 788 358 L 780 345 L 778 330 L 778 318 Z",
];

function threatColor(type: string): string {
  switch (type) {
    case "breach": return "#ff4444";
    case "infrastructure": return "#ff8800";
    case "deception": return "#00ffff";
    case "attack": return "#ff0066";
    default: return "#00ffff";
  }
}

function threatGlow(type: string): string {
  switch (type) {
    case "breach": return "0 0 12px rgba(255,68,68,0.8)";
    case "infrastructure": return "0 0 12px rgba(255,136,0,0.8)";
    case "deception": return "0 0 12px rgba(0,255,255,0.8)";
    case "attack": return "0 0 12px rgba(255,0,102,0.8)";
    default: return "0 0 12px rgba(0,255,255,0.8)";
  }
}

function severityRadius(severity: string): number {
  switch (severity) {
    case "CRITICAL": return 6;
    case "HIGH": return 5;
    case "MEDIUM": return 4;
    case "LOW": return 3;
    default: return 4;
  }
}

export default function ThreatMap() {
  const { data: threats, isLoading } = useThreatMapData();
  const [hoveredPoint, setHoveredPoint] = useState<GeoThreatPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const stats = useMemo(() => {
    if (!threats || threats.length === 0) {
      return { total: 0, countries: 0, origins: 0, highestRisk: "N/A" };
    }

    const regionBuckets: Record<string, number> = {};
    threats.forEach((t) => {
      const region = t.lat > 0 ? (t.lng > 0 ? "ASIA-PACIFIC" : (t.lng > -30 ? "EUROPE" : "AMERICAS")) : (t.lng > 0 ? "AFRICA/OCEANIA" : "SOUTH AMERICA");
      regionBuckets[region] = (regionBuckets[region] || 0) + 1;
    });

    const coordSet = new Set(threats.map((t) => `${Math.round(t.lat / 5)},${Math.round(t.lng / 5)}`));
    const attackOrigins = threats.filter((t) => t.type === "attack" || t.type === "breach").length;
    const highestRisk = Object.entries(regionBuckets).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    return {
      total: threats.length,
      countries: coordSet.size,
      origins: attackOrigins,
      highestRisk,
    };
  }, [threats]);

  const typeCounts = useMemo(() => {
    if (!threats) return { breach: 0, infrastructure: 0, deception: 0, attack: 0 };
    return {
      breach: threats.filter((t) => t.type === "breach").length,
      infrastructure: threats.filter((t) => t.type === "infrastructure").length,
      deception: threats.filter((t) => t.type === "deception").length,
      attack: threats.filter((t) => t.type === "attack").length,
    };
  }, [threats]);

  const arcLines = useMemo(() => {
    if (!threats || threats.length < 2) return [];
    const attacks = threats.filter((t) => t.type === "attack" || t.type === "breach");
    const targets = threats.filter((t) => t.type === "infrastructure" || t.type === "deception");
    const lines: { from: GeoThreatPoint; to: GeoThreatPoint }[] = [];
    attacks.forEach((a, i) => {
      if (targets.length > 0) {
        lines.push({ from: a, to: targets[i % targets.length] });
      }
    });
    return lines.slice(0, 20);
  }, [threats]);

  return (
    <Layout>
      <div className="space-y-4" data-testid="threat-map-page">
        <div className="flex items-center gap-3 flex-wrap">
          <Globe className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-wider uppercase">Global Threat Intelligence Map</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card/80 tactical-border p-3 rounded-sm" data-testid="stat-total-threats">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Geo Threats</p>
            <p className="text-2xl font-mono text-primary">{stats.total}</p>
          </div>
          <div className="bg-card/80 tactical-border p-3 rounded-sm" data-testid="stat-countries">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Regions Affected</p>
            <p className="text-2xl font-mono text-orange-400">{stats.countries}</p>
          </div>
          <div className="bg-card/80 tactical-border p-3 rounded-sm" data-testid="stat-attack-origins">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Attack Origins</p>
            <p className="text-2xl font-mono text-red-400">{stats.origins}</p>
          </div>
          <div className="bg-card/80 tactical-border p-3 rounded-sm" data-testid="stat-highest-risk">
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Highest Risk Region</p>
            <p className="text-sm font-mono text-cyan-400 mt-1">{stats.highestRisk}</p>
          </div>
        </div>

        <div className="bg-card/80 tactical-border rounded-sm overflow-hidden relative" data-testid="threat-map-container">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-background/60">
              <div className="flex items-center gap-3">
                <Crosshair className="w-6 h-6 text-primary animate-spin" />
                <span className="font-mono text-sm text-primary uppercase tracking-wider">Loading threat data...</span>
              </div>
            </div>
          )}

          <svg
            viewBox="0 0 1000 500"
            className="w-full h-auto"
            style={{ background: "linear-gradient(180deg, hsl(220 50% 3%) 0%, hsl(220 50% 5%) 100%)" }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
            }}
            data-testid="threat-map-svg"
          >
            {Array.from({ length: 25 }).map((_, i) => (
              <line key={`grid-h-${i}`} x1={0} y1={i * 20} x2={1000} y2={i * 20} stroke="rgba(0,255,255,0.04)" strokeWidth={0.5} />
            ))}
            {Array.from({ length: 50 }).map((_, i) => (
              <line key={`grid-v-${i}`} x1={i * 20} y1={0} x2={i * 20} y2={500} stroke="rgba(0,255,255,0.04)" strokeWidth={0.5} />
            ))}

            {WORLD_PATHS.map((d, i) => (
              <path key={`continent-${i}`} d={d} fill="rgba(0,255,255,0.06)" stroke="rgba(0,255,255,0.15)" strokeWidth={1} />
            ))}

            <line x1={0} y1={250} x2={1000} y2={250} stroke="rgba(0,255,255,0.08)" strokeWidth={0.5} strokeDasharray="4 4" />
            <line x1={500} y1={0} x2={500} y2={500} stroke="rgba(0,255,255,0.08)" strokeWidth={0.5} strokeDasharray="4 4" />

            {arcLines.map((arc, i) => {
              const from = geoToSvg(arc.from.lat, arc.from.lng);
              const to = geoToSvg(arc.to.lat, arc.to.lng);
              const midX = (from.x + to.x) / 2;
              const midY = Math.min(from.y, to.y) - 40;
              const color = threatColor(arc.from.type);
              return (
                <g key={`arc-${i}`}>
                  <path
                    d={`M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`}
                    fill="none"
                    stroke={color}
                    strokeWidth={1}
                    opacity={0.4}
                    strokeDasharray="4 2"
                  >
                    <animate attributeName="stroke-dashoffset" from="24" to="0" dur="2s" repeatCount="indefinite" />
                  </path>
                </g>
              );
            })}

            {threats?.map((point, i) => {
              const { x, y } = geoToSvg(point.lat, point.lng);
              const color = threatColor(point.type);
              const r = severityRadius(point.severity);
              return (
                <g
                  key={`threat-${i}`}
                  data-testid={`threat-point-${i}`}
                  onMouseEnter={() => setHoveredPoint(point)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle cx={x} cy={y} r={r * 2.5} fill={color} opacity={0.1}>
                    <animate attributeName="r" values={`${r * 2};${r * 3.5};${r * 2}`} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r={r} fill={color} opacity={0.9}>
                    <animate attributeName="r" values={`${r};${r * 1.3};${r}`} dur="2s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={x} cy={y} r={r * 0.4} fill="white" opacity={0.7} />
                </g>
              );
            })}
          </svg>

          {hoveredPoint && (
            <div
              className="absolute z-40 pointer-events-none bg-card/95 border border-primary/40 rounded-sm p-3 max-w-xs"
              style={{
                left: Math.min(mousePos.x + 12, 300),
                top: mousePos.y + 12,
              }}
              data-testid="threat-tooltip"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: threatColor(hoveredPoint.type), boxShadow: threatGlow(hoveredPoint.type) }} />
                <span className="font-mono text-xs uppercase tracking-wider text-primary">{hoveredPoint.type}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm border ${
                  hoveredPoint.severity === "CRITICAL" ? "bg-red-500/20 text-red-400 border-red-500/40"
                    : hoveredPoint.severity === "HIGH" ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                }`}>
                  {hoveredPoint.severity}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground">{hoveredPoint.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{hoveredPoint.details}</p>
              <p className="text-[10px] font-mono text-muted-foreground/60 mt-1">
                {hoveredPoint.lat.toFixed(2)}, {hoveredPoint.lng.toFixed(2)}
              </p>
            </div>
          )}
        </div>

        <div className="bg-card/80 tactical-border rounded-sm p-4" data-testid="threat-legend">
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">Threat Legend</p>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 shadow-[0_0_8px_rgba(255,68,68,0.6)]" />
              <span className="font-mono text-xs text-muted-foreground">Breach ({typeCounts.breach})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(255,136,0,0.6)]" />
              <span className="font-mono text-xs text-muted-foreground">Infrastructure ({typeCounts.infrastructure})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(0,255,255,0.6)]" />
              <span className="font-mono text-xs text-muted-foreground">Deception ({typeCounts.deception})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(255,0,102,0.6)]" />
              <span className="font-mono text-xs text-muted-foreground">Attack ({typeCounts.attack})</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
