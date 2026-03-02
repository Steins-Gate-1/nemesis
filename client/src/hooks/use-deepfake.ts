import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useDeepfakeScans() {
  return useQuery({
    queryKey: [api.deepfake.list.path],
    queryFn: async () => {
      const res = await fetch(api.deepfake.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deepfake scans");
      return res.json();
    },
  });
}

export function useDeepfakeScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { mediaUrl: string; mediaType?: string; subjectName?: string }) => {
      const res = await fetch(api.deepfake.scan.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to initiate scan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deepfake.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deepfake.stats.path] });
    },
  });
}

export function useDeepfakeStats() {
  return useQuery({
    queryKey: [api.deepfake.stats.path],
    queryFn: async () => {
      const res = await fetch(api.deepfake.stats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deepfake stats");
      return res.json();
    },
  });
}

export function useDeepfakeExposureProfiles() {
  return useQuery({
    queryKey: [api.deepfake.exposure.list.path],
    queryFn: async () => {
      const res = await fetch(api.deepfake.exposure.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch exposure profiles");
      return res.json();
    },
  });
}

export function useCreateExposureProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      subjectName: string;
      videoMinutes: number;
      audioScore: number;
      faceVisibilityScore: number;
      imageAvailabilityScore: number;
    }) => {
      const res = await fetch(api.deepfake.exposure.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create exposure profile");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.deepfake.exposure.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.deepfake.stats.path] });
    },
  });
}

export function useMitigationGuidance() {
  return useMutation({
    mutationFn: async (data: { exposureLevel: string; syntheticDetected?: boolean }) => {
      const res = await fetch(api.deepfake.mitigate.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to generate mitigation guidance");
      return res.json() as Promise<{ guidance: string[] }>;
    },
  });
}
