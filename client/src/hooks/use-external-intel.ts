import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface CorrelationTrigger {
  rule_id: string;
  rule_name: string;
  description: string;
  escalation_points: number;
  conditions_met: string[];
}

export interface AnalyzeResult {
  dark_web_risk: any;
  password_risk: any;
  combined_score: number;
  combined_risk_level: string;
  individual_signals: Record<string, { raw_risk_level: string; base_score: number }>;
  weighted_scores: Record<string, number>;
  correlation_triggers: CorrelationTrigger[];
  attack_probability_percentage: number;
  explainability_report: string;
}

export function useExternalAnalysis() {
  return useMutation<AnalyzeResult, Error, { target: string; password?: string }>({
    mutationFn: async (data) => {
      const res = await apiRequest("POST", "/api/analyze", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/alerts/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/audit"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
    },
  });
}
