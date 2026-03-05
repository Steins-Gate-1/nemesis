import { useQuery } from "@tanstack/react-query";

export interface TopologyNode {
  id: string;
  type: "domain" | "ip" | "port" | "cve" | "breach";
  label: string;
  details: Record<string, unknown>;
  severity?: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  pinned: boolean;
}

export interface TopologyEdge {
  source: string;
  target: string;
  severity: number;
}

interface InfraHost {
  ip?: string;
  ports?: number[];
  vulns?: string[];
  org?: string;
  city?: string;
  country_name?: string;
}

interface BreachRecord {
  Name?: string;
  Domain?: string;
  BreachDate?: string;
  PwnCount?: number;
  DataClasses?: string[];
}

interface GitHubLeak {
  repository?: string;
  file?: string;
  type?: string;
  severity?: string;
}

function buildTopology(
  infrastructure: InfraHost[],
  breaches: BreachRecord[],
  githubLeaks: GitHubLeak[],
): { nodes: TopologyNode[]; edges: TopologyEdge[] } {
  const nodes: TopologyNode[] = [];
  const edges: TopologyEdge[] = [];
  const nodeIds = new Set<string>();

  const addNode = (node: TopologyNode) => {
    if (!nodeIds.has(node.id)) {
      nodeIds.add(node.id);
      nodes.push(node);
    }
  };

  const domainId = "domain-target";
  addNode({
    id: domainId,
    type: "domain",
    label: "Target Domain",
    details: {},
    severity: 5,
    x: 400 + Math.random() * 50,
    y: 300 + Math.random() * 50,
    vx: 0,
    vy: 0,
    pinned: false,
  });

  if (Array.isArray(infrastructure)) {
    infrastructure.forEach((host, i) => {
      const ipId = `ip-${host.ip || i}`;
      addNode({
        id: ipId,
        type: "ip",
        label: host.ip || `Host ${i}`,
        details: { org: host.org, city: host.city, country: host.country_name },
        severity: 3,
        x: 300 + Math.random() * 200,
        y: 200 + Math.random() * 200,
        vx: 0,
        vy: 0,
        pinned: false,
      });
      edges.push({ source: domainId, target: ipId, severity: 3 });

      if (Array.isArray(host.ports)) {
        host.ports.forEach((port) => {
          const portId = `port-${host.ip}-${port}`;
          addNode({
            id: portId,
            type: "port",
            label: `${port}`,
            details: { port, ip: host.ip },
            severity: port === 22 || port === 3389 ? 4 : 2,
            x: 250 + Math.random() * 300,
            y: 150 + Math.random() * 300,
            vx: 0,
            vy: 0,
            pinned: false,
          });
          edges.push({ source: ipId, target: portId, severity: 2 });
        });
      }

      if (Array.isArray(host.vulns)) {
        host.vulns.forEach((cve) => {
          const cveId = `cve-${cve}`;
          addNode({
            id: cveId,
            type: "cve",
            label: cve,
            details: { cveId: cve },
            severity: 5,
            x: 350 + Math.random() * 200,
            y: 100 + Math.random() * 400,
            vx: 0,
            vy: 0,
            pinned: false,
          });
          edges.push({ source: ipId, target: cveId, severity: 5 });
        });
      }
    });
  }

  if (Array.isArray(breaches)) {
    breaches.forEach((breach, i) => {
      const breachId = `breach-${breach.Name || i}`;
      addNode({
        id: breachId,
        type: "breach",
        label: breach.Name || `Breach ${i}`,
        details: {
          domain: breach.Domain,
          date: breach.BreachDate,
          pwnCount: breach.PwnCount,
          dataClasses: breach.DataClasses,
        },
        severity: 4,
        x: 500 + Math.random() * 200,
        y: 200 + Math.random() * 200,
        vx: 0,
        vy: 0,
        pinned: false,
      });
      edges.push({ source: domainId, target: breachId, severity: 4 });
    });
  }

  if (Array.isArray(githubLeaks)) {
    githubLeaks.forEach((leak, i) => {
      const leakId = `cve-github-${i}`;
      addNode({
        id: leakId,
        type: "cve",
        label: leak.type || `Leak ${i}`,
        details: { repository: leak.repository, file: leak.file, severity: leak.severity },
        severity: leak.severity === "critical" ? 5 : 3,
        x: 200 + Math.random() * 400,
        y: 300 + Math.random() * 200,
        vx: 0,
        vy: 0,
        pinned: false,
      });
      edges.push({ source: domainId, target: leakId, severity: 3 });
    });
  }

  return { nodes, edges };
}

export function useTopologyData() {
  const infraQuery = useQuery<InfraHost[]>({
    queryKey: ["/api/threats/infrastructure"],
  });

  const breachQuery = useQuery<BreachRecord[]>({
    queryKey: ["/api/threats/breaches"],
  });

  const githubQuery = useQuery<GitHubLeak[]>({
    queryKey: ["/api/threats/github"],
  });

  const isLoading = infraQuery.isLoading || breachQuery.isLoading || githubQuery.isLoading;
  const isError = infraQuery.isError && breachQuery.isError && githubQuery.isError;

  const topology = buildTopology(
    infraQuery.data || [],
    breachQuery.data || [],
    githubQuery.data || [],
  );

  return {
    ...topology,
    isLoading,
    isError,
  };
}
