import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDeepfakeScans() {
  return useQuery({
    queryKey: [api.deepfake.list.path],
    queryFn: async () => {
      const res = await fetch(api.deepfake.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deepfake scans");
      return api.deepfake.list.responses[200].parse(await res.json());
    },
  });
}

export function useInitiateDeepfakeScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mediaUrl: string) => {
      const res = await fetch(api.deepfake.scan.path, {
        method: api.deepfake.scan.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to initiate scan");
      return api.deepfake.scan.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.deepfake.list.path] }),
  });
}
