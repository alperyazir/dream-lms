/**
 * Hook for fetching admin dashboard statistics
 */
import { useQuery } from "@tanstack/react-query";
import { getStats } from "../../../services/adminService";

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["admin", "dashboard", "stats"],
    queryFn: getStats,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
  });
};
