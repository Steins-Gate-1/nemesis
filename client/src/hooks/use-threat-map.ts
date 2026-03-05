import { useQuery } from "@tanstack/react-query";

export interface GeoThreatPoint {
  lat: number;
  lng: number;
  type: "breach" | "infrastructure" | "deception" | "attack";
  severity: string;
  label: string;
  details: string;
  timestamp: string;
}

export function useThreatMapData() {
  return useQuery<GeoThreatPoint[]>({
    queryKey: ["/api/threat-map/data"],
    refetchInterval: 30000,
  });
}
