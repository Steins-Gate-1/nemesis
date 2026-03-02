import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useRiskScores() {
  return useQuery({
    queryKey: [api.risk.scores.path],
    queryFn: async () => {
      const res = await fetch(api.risk.scores.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch risk scores");
      return api.risk.scores.responses[200].parse(await res.json());
    },
  });
}
