/**
 * Hook for fetching teachers (read-only)
 */
import { useQuery } from "@tanstack/react-query";
import type { ListParams } from "../../../types/admin";
import { getTeachers } from "../../../services/adminService";

export const useTeachers = (params: ListParams = {}) => {
  return useQuery({
    queryKey: ["admin", "teachers", params],
    queryFn: () => getTeachers(params),
    staleTime: 30000,
  });
};
