import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AnalyzeResult {
  dark_web_risk: any;
  password_risk: any;
  combined_score: number;
  combined_risk_level: string;
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
