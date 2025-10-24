/**
 * Hook for fetching students (read-only)
 */
import { useQuery } from "@tanstack/react-query";
import type { ListParams } from "../../../types/admin";
import { getStudents } from "../../../services/adminService";

export const useStudents = (params: ListParams = {}) => {
  return useQuery({
    queryKey: ["admin", "students", params],
    queryFn: () => getStudents(params),
    staleTime: 30000,
  });
};
