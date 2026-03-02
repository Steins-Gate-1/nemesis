import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { z } from "zod";

type DeceptionAssetInput = z.infer<typeof api.deception.create.input>;

export function useDeceptionAssets() {
  return useQuery({
    queryKey: [api.deception.list.path],
    queryFn: async () => {
      const res = await fetch(api.deception.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch deception assets");
      return api.deception.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateDeceptionAsset() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: DeceptionAssetInput) => {
      const validated = api.deception.create.input.parse(data);
      const res = await fetch(api.deception.create.path, {
        method: api.deception.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create deception asset");
      return api.deception.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.deception.list.path] }),
  });
}
