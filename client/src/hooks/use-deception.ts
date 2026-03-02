import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useDeceptionAssets() {
  return useQuery({
    queryKey: [api.deception.list.path],
    queryFn: async () => {
      const res = await fetch(api.deception.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deception assets");
      return res.json();
    },
  });
}

export function useDeceptionStats() {
  return useQuery({
    queryKey: [api.deception.stats.path],
    queryFn: async () => {
      const res = await fetch(api.deception.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deception stats");
      return res.json();
    },
  });
}

export function useCorrelation() {
  return useQuery({
    queryKey: [api.deception.correlation.path],
    queryFn: async () => {
      const res = await fetch(api.deception.correlation.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch correlation data");
      return res.json();
    },
  });
}

export function useDeployHoneytoken() {
  return useMutation({
    mutationFn: async (data: { tokenType: string; placementLocation: string }) => {
      const res = await apiRequest("POST", api.deception.deploy.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deception.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deception.stats.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit'] });
    },
  });
}

export function useDeleteDeceptionAsset() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/deception/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deception.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deception.stats.path] });
    },
  });
}

export function useSimulateTrigger() {
  return useMutation({
    mutationFn: async (data: { tokenId: string; sourceIp?: string }) => {
      const res = await apiRequest("POST", api.deception.simulateTrigger.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deception.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deception.stats.path] });
      queryClient.invalidateQueries({ queryKey: [api.deception.correlation.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/risk'] });
    },
  });
}

export function useHoneyPersonas() {
  return useQuery({
    queryKey: [api.deception.personas.list.path],
    queryFn: async () => {
      const res = await fetch(api.deception.personas.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch honey personas");
      return res.json();
    },
  });
}

export function useCreateHoneyPersona() {
  return useMutation({
    mutationFn: async (data: { deploymentContext?: string }) => {
      const res = await apiRequest("POST", api.deception.personas.create.path, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deception.personas.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deception.stats.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/audit'] });
    },
  });
}

export function useRetirePersona() {
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/deception/personas/${id}/retire`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deception.personas.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deception.stats.path] });
    },
  });
}
