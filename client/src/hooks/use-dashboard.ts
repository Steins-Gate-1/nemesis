import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.dashboard.stats.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return api.dashboard.stats.responses[200].parse(await res.json());
    },
  });
}

export function useAnalyzeTarget() {
  return useMutation({
    mutationFn: async (data: { target: string; type: "domain" | "email" }) => {
      const validated = api.scans.analyze.input.parse(data);
      const res = await fetch(api.scans.analyze.path, {
        method: api.scans.analyze.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to initiate analysis");
      return api.scans.analyze.responses[200].parse(await res.json());
    },
  });
}
