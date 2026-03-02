import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAuditLogs() {
  return useQuery({
    queryKey: [api.audit.list.path],
    queryFn: async () => {
      const res = await fetch(api.audit.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch audit logs");
      return await res.json();
    },
  });
}

export function useSearchAuditLogs(params: { entity?: string; action?: string; actor?: string }) {
  const searchParams = new URLSearchParams();
  if (params.entity) searchParams.set("entity", params.entity);
  if (params.action) searchParams.set("action", params.action);
  if (params.actor) searchParams.set("actor", params.actor);
  const queryString = searchParams.toString();
  const url = queryString ? `${api.audit.search.path}?${queryString}` : api.audit.search.path;
  const hasFilters = !!(params.entity || params.action || params.actor);

  return useQuery({
    queryKey: [api.audit.search.path, params.entity, params.action, params.actor],
    queryFn: async () => {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to search audit logs");
      return await res.json();
    },
    enabled: hasFilters,
  });
}
