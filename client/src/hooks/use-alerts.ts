import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { apiRequest } from "@/lib/queryClient";

export function useAlerts() {
  return useQuery({
    queryKey: [api.alerts.list.path],
    queryFn: async () => {
      const res = await fetch(api.alerts.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return await res.json();
    },
  });
}

export function useActiveAlerts() {
  return useQuery({
    queryKey: [api.alerts.active.path],
    queryFn: async () => {
      const res = await fetch(api.alerts.active.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch active alerts");
      return await res.json();
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.alerts.markRead.path, { id });
      const res = await fetch(url, { method: api.alerts.markRead.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to mark alert as read");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.alerts.active.path] });
    },
  });
}

export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: "OPEN" | "ACKNOWLEDGED" | "UNDER_REVIEW" | "RESOLVED" }) => {
      const url = buildUrl(api.alerts.updateStatus.path, { id });
      const res = await apiRequest("PATCH", url, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.alerts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.alerts.active.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
