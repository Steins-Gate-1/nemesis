import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function useRiskScores() {
  return useQuery({
    queryKey: [api.risk.scores.path],
    queryFn: async () => {
      const res = await fetch(api.risk.scores.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch risk scores");
      return await res.json();
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { reportType: "EXPOSURE" | "ACTIVE_TARGETING" | "DEEPFAKE_INCIDENT" | "EXECUTIVE_SUMMARY"; domain?: string }) => {
      const res = await apiRequest("POST", api.reports.generate.path, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.reports.list.path] });
    },
  });
}

export function useReports() {
  return useQuery({
    queryKey: [api.reports.list.path],
    queryFn: async () => {
      const res = await fetch(api.reports.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch reports");
      return await res.json();
    },
  });
}
