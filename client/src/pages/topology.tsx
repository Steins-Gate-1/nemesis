import { Layout } from "@/components/layout";
import { useTopologyData, TopologyNode, TopologyEdge } from "@/hooks/use-topology";
import { useState, useRef, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Loader2, Network, AlertTriangle, GitBranch, Shield } from "lucide-react";

const NODE_COLORS: Record<string, string> = {
  domain: "#00FFFF",
  ip: "#FF8C00",
  port: "#00FF88",
  cve: "#FF3333",
  breach: "#AA44FF",
};

const NODE_SIZES: Record<string, number> = {
  domain: 20,
  ip: 14,
  port: 8,
  cve: 10,
  breach: 12,
};

function renderNodeShape(type: string, size: number, color: string) {
  switch (type) {
    case "domain": {
      const r = size;
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        return `${Math.cos(angle) * r},${Math.sin(angle) * r}`;
      }).join(" ");
      return <polygon points={pts} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1.5} />;
    }
    case "cve": {
      const s = size;
      return <polygon points={`0,${-s} ${s},0 0,${s} ${-s},0`} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1.5} />;
    }
    case "breach": {
      const s = size;
      return <polygon points={`0,${-s} ${s},${s} ${-s},${s}`} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1.5} />;
    }
    default:
      return <circle r={size} fill={color} fillOpacity={0.3} stroke={color} strokeWidth={1.5} />;
  }
}

interface SimNode extends TopologyNode {
  fx?: number | null;
  fy?: number | null;
}

export default function TopologyPage() {
  const { nodes: rawNodes, edges, isLoading } = useTopologyData();
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const nodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<TopologyEdge[]>([]);
  const animRef = useRef<number>(0);
  const dragRef = useRef<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (rawNodes.length === 0) return;
    const initialized: SimNode[] = rawNodes.map((n) => ({
      ...n,
      x: n.x || 400 + (Math.random() - 0.5) * 300,
      y: n.y || 300 + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
      fx: null,
      fy: null,
    }));
    nodesRef.current = initialized;
    edgesRef.current = edges;
    setSimNodes([...initialized]);
  }, [rawNodes.length, edges.length]);

  useEffect(() => {
    if (nodesRef.current.length === 0) return;

    const CX = 400;
    const CY = 300;
    const REPULSION = 3000;
    const ATTRACTION = 0.005;
    const GRAVITY = 0.02;
    const DAMPING = 0.85;
    let frameCount = 0;

    const tick = () => {
      const ns = nodesRef.current;
      const es = edgesRef.current;

      for (let i = 0; i < ns.length; i++) {
        if (ns[i].pinned || ns[i].fx != null) continue;
        let fx = 0;
        let fy = 0;

        for (let j = 0; j < ns.length; j++) {
          if (i === j) continue;
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = REPULSION / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        for (const e of es) {
          let other: SimNode | undefined;
          if (e.source === ns[i].id) other = ns.find((n) => n.id === e.target);
          else if (e.target === ns[i].id) other = ns.find((n) => n.id === e.source);
          if (!other) continue;
          const dx = other.x - ns[i].x;
          const dy = other.y - ns[i].y;
          fx += dx * ATTRACTION;
          fy += dy * ATTRACTION;
        }

        fx += (CX - ns[i].x) * GRAVITY;
        fy += (CY - ns[i].y) * GRAVITY;

        ns[i].vx = (ns[i].vx + fx) * DAMPING;
        ns[i].vy = (ns[i].vy + fy) * DAMPING;
        ns[i].x += ns[i].vx;
        ns[i].y += ns[i].vy;

        ns[i].x = Math.max(30, Math.min(770, ns[i].x));
        ns[i].y = Math.max(30, Math.min(570, ns[i].y));
      }

      for (const n of ns) {
        if (n.fx != null) n.x = n.fx;
        if (n.fy != null) n.y = n.fy;
      }

      frameCount++;
      if (frameCount % 2 === 0) {
        setSimNodes([...ns]);
      }

      animRef.current = requestAnimationFrame(tick);
    };

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [simNodes.length > 0]);

  const handleNodeClick = useCallback(
    (node: SimNode) => {
      setSelectedNode(node);
      const connected = new Set<string>([node.id]);
      edgesRef.current.forEach((e) => {
        if (e.source === node.id) connected.add(e.target);
        if (e.target === node.id) connected.add(e.source);
      });
      setHighlightedIds(connected);
    },
    [],
  );

  const handleMouseDown = useCallback((nodeId: string) => {
    dragRef.current = nodeId;
    const n = nodesRef.current.find((nd) => nd.id === nodeId);
    if (n) {
      n.pinned = true;
      n.fx = n.x;
      n.fy = n.y;
    }
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragRef.current || !svgRef.current) return;
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = 800 / rect.width;
    const scaleY = 600 / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const n = nodesRef.current.find((nd) => nd.id === dragRef.current);
    if (n) {
      n.fx = x;
      n.fy = y;
      n.x = x;
      n.y = y;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      const n = nodesRef.current.find((nd) => nd.id === dragRef.current);
      if (n) {
        n.pinned = false;
        n.fx = null;
        n.fy = null;
      }
      dragRef.current = null;
    }
  }, []);

  const totalNodes = simNodes.length;
  const totalEdges = edges.length;
  const criticalNodes = simNodes.filter((n) => (n.severity || 0) >= 4).length;
  const attackPaths = edges.filter((e) => e.severity >= 4).length;

  return (
    <Layout>
      <div className="space-y-4" data-testid="topology-page">
        <div className="flex items-center gap-3 flex-wrap">
          <Network className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold tracking-wider uppercase">Attack Surface Topology</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "TOTAL NODES", value: totalNodes, icon: Network },
            { label: "EDGES", value: totalEdges, icon: GitBranch },
            { label: "ATTACK PATHS", value: attackPaths, icon: AlertTriangle },
            { label: "CRITICAL NODES", value: criticalNodes, icon: Shield },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card/80 tactical-border p-3" data-testid={`stat-${stat.label.toLowerCase().replace(/\s/g, "-")}`}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-4 h-4 text-primary/70" />
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{stat.label}</span>
              </div>
              <span className="text-xl font-mono font-bold text-primary">{stat.value}</span>
            </Card>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          <Card className="flex-1 bg-card/80 tactical-border p-0 overflow-visible" data-testid="topology-graph">
            {isLoading ? (
              <div className="flex items-center justify-center h-[500px]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="ml-3 font-mono text-muted-foreground">MAPPING ATTACK SURFACE...</span>
              </div>
            ) : (
              <div className="relative">
                <svg
                  ref={svgRef}
                  viewBox="0 0 800 600"
                  className="w-full h-auto cursor-crosshair"
                  style={{ minHeight: 400 }}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  data-testid="topology-svg"
                >
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <rect width="800" height="600" fill="transparent" onClick={() => { setSelectedNode(null); setHighlightedIds(new Set()); }} />

                  {simNodes.length > 0 && edges.map((edge, i) => {
                    const src = simNodes.find((n) => n.id === edge.source);
                    const tgt = simNodes.find((n) => n.id === edge.target);
                    if (!src || !tgt) return null;
                    const dimmed = highlightedIds.size > 0 && !highlightedIds.has(edge.source) && !highlightedIds.has(edge.target);
                    return (
                      <line
                        key={`edge-${i}`}
                        x1={src.x}
                        y1={src.y}
                        x2={tgt.x}
                        y2={tgt.y}
                        stroke={dimmed ? "rgba(100,100,100,0.15)" : `rgba(0,255,255,${0.15 + edge.severity * 0.1})`}
                        strokeWidth={dimmed ? 0.5 : 1}
                        data-testid={`edge-${i}`}
                      />
                    );
                  })}

                  {simNodes.map((node) => {
                    const color = NODE_COLORS[node.type] || "#00FFFF";
                    const size = NODE_SIZES[node.type] || 10;
                    const dimmed = highlightedIds.size > 0 && !highlightedIds.has(node.id);
                    return (
                      <g
                        key={node.id}
                        transform={`translate(${node.x},${node.y})`}
                        opacity={dimmed ? 0.2 : 1}
                        style={{ cursor: "grab", filter: dimmed ? "none" : "url(#glow)" }}
                        onMouseDown={(e) => { e.preventDefault(); handleMouseDown(node.id); }}
                        onClick={(e) => { e.stopPropagation(); handleNodeClick(node); }}
                        onMouseEnter={(e) => {
                          setHoveredNode(node);
                          const rect = svgRef.current?.getBoundingClientRect();
                          if (rect) {
                            setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                          }
                        }}
                        onMouseLeave={() => setHoveredNode(null)}
                        data-testid={`node-${node.id}`}
                      >
                        {renderNodeShape(node.type, size, color)}
                        <text
                          y={size + 12}
                          textAnchor="middle"
                          fill={color}
                          fontSize="8"
                          fontFamily="monospace"
                          opacity={0.8}
                        >
                          {node.label.length > 15 ? node.label.slice(0, 15) + "..." : node.label}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                {hoveredNode && (
                  <div
                    className="absolute pointer-events-none bg-black/90 border border-primary/50 p-2 rounded-sm font-mono text-xs z-50"
                    style={{
                      left: Math.min(tooltipPos.x + 10, 600),
                      top: tooltipPos.y - 40,
                    }}
                    data-testid="topology-tooltip"
                  >
                    <div className="text-primary font-bold uppercase">{hoveredNode.type}</div>
                    <div className="text-foreground">{hoveredNode.label}</div>
                    <div className="text-muted-foreground">Severity: {hoveredNode.severity}/5</div>
                  </div>
                )}

                <div className="absolute bottom-2 left-2 flex flex-wrap gap-3 bg-black/70 p-2 rounded-sm border border-primary/20" data-testid="topology-legend">
                  {Object.entries(NODE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.6 }} />
                      <span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {selectedNode && (
            <Card className="w-full lg:w-72 bg-card/80 tactical-border p-4 space-y-3" data-testid="node-details-panel">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: NODE_COLORS[selectedNode.type] }} />
                <span className="text-xs font-mono uppercase tracking-wider text-primary">{selectedNode.type} Details</span>
              </div>
              <div className="space-y-2 text-sm font-mono">
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Label</span>
                  <div className="text-foreground" data-testid="detail-label">{selectedNode.label}</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase">Severity</span>
                  <div className="text-foreground" data-testid="detail-severity">{selectedNode.severity}/5</div>
                </div>
                <div>
                  <span className="text-muted-foreground text-xs uppercase">ID</span>
                  <div className="text-foreground text-xs break-all" data-testid="detail-id">{selectedNode.id}</div>
                </div>
                {Object.entries(selectedNode.details).map(([key, val]) =>
                  val != null ? (
                    <div key={key}>
                      <span className="text-muted-foreground text-xs uppercase">{key}</span>
                      <div className="text-foreground text-xs break-all" data-testid={`detail-${key}`}>
                        {Array.isArray(val) ? val.join(", ") : String(val)}
                      </div>
                    </div>
                  ) : null,
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
