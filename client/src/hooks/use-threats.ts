import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useBreaches() {
  return useQuery({
    queryKey: [api.threats.breaches.path],
    queryFn: async () => {
      const res = await fetch(api.threats.breaches.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch breaches");
      return api.threats.breaches.responses[200].parse(await res.json());
    },
  });
}

export function useInfrastructureExposure() {
  return useQuery({
    queryKey: [api.threats.infrastructure.path],
    queryFn: async () => {
      const res = await fetch(api.threats.infrastructure.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch infra exposure");
      return api.threats.infrastructure.responses[200].parse(await res.json());
    },
  });
}

export function useGithubExposure() {
  return useQuery({
    queryKey: [api.threats.github.path],
    queryFn: async () => {
      const res = await fetch(api.threats.github.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch github exposure");
      return api.threats.github.responses[200].parse(await res.json());
    },
  });
}

export function useAttackScenarios() {
  return useQuery({
    queryKey: [api.threats.attackScenarios.path],
    queryFn: async () => {
      const res = await fetch(api.threats.attackScenarios.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch attack scenarios");
      return api.threats.attackScenarios.responses[200].parse(await res.json());
    },
  });
}

export function useSimulateAttack() {
  return useMutation({
    mutationFn: async (domain: string) => {
      const res = await apiRequest("POST", api.threats.simulateAttack.path, { domain });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.threats.attackScenarios.path] });
      queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
    },
  });
}
