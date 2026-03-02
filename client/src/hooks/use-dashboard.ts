import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDashboardStats() {
  return useQuery({
    queryKey: [api.dashboard.stats.path],
    queryFn: async () => {
      const res = await fetch(api.dashboard.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch dashboard stats");
      return await res.json();
    },
  });
}

export function useAnalyzeTarget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { target: string; type: "domain" | "email" }) => {
      const validated = api.scans.analyze.input.parse(data);
      const res = await fetch(api.scans.analyze.path, {
        method: api.scans.analyze.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to initiate analysis");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.threats.breaches.path] });
      queryClient.invalidateQueries({ queryKey: [api.threats.infrastructure.path] });
      queryClient.invalidateQueries({ queryKey: [api.threats.github.path] });
      queryClient.invalidateQueries({ queryKey: [api.risk.scores.path] });
      queryClient.invalidateQueries({ queryKey: [api.audit.list.path] });
    },
  });
}

export function useSystemHealth() {
  return useQuery({
    queryKey: [api.system.health.path],
    queryFn: async () => {
      const res = await fetch(api.system.health.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch system health");
      return await res.json();
    },
  });
}
