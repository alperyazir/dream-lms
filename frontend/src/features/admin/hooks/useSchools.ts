/**
 * Hook for schools CRUD operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ListParams,
  SchoolCreate,
  SchoolUpdate,
} from "../../../types/admin";
import {
  createSchool,
  deleteSchool,
  getSchools,
  updateSchool,
} from "../../../services/adminService";

export const useSchools = (params: ListParams = {}) => {
  return useQuery({
    queryKey: ["admin", "schools", params],
    queryFn: () => getSchools(params),
    staleTime: 30000,
  });
};

export const useCreateSchool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SchoolCreate) => createSchool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "dashboard", "stats"],
      });
    },
  });
};

export const useUpdateSchool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SchoolUpdate }) =>
      updateSchool(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
    },
  });
};

export const useDeleteSchool = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSchool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "dashboard", "stats"],
      });
    },
  });
};
