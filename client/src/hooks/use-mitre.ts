import { useQuery } from "@tanstack/react-query";

export interface MitreTechnique {
  techniqueId: string;
  techniqueName: string;
  description: string;
  relevance: string;
  evidenceCount: number;
  sources: string[];
  severity: string;
}

export interface MitreTactic {
  tacticId: string;
  tacticName: string;
  shortName: string;
  techniques: MitreTechnique[];
}

export interface MitreMatrixResult {
  tactics: MitreTactic[];
  totalTacticsActive: number;
  totalTechniquesActive: number;
  coveragePercentage: number;
  highestRiskTactic: string;
  overallRiskLevel: string;
}

export function useMitreMatrix() {
  return useQuery<MitreMatrixResult>({
    queryKey: ["/api/mitre/matrix"],
  });
}
