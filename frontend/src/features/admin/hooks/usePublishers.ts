/**
 * Hook for publishers CRUD operations
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  ListParams,
  PublisherCreate,
  PublisherUpdate,
} from "../../../types/admin";
import {
  createPublisher,
  deletePublisher,
  getPublishers,
  updatePublisher,
} from "../../../services/adminService";

export const usePublishers = (params: ListParams = {}) => {
  return useQuery({
    queryKey: ["admin", "publishers", params],
    queryFn: () => getPublishers(params),
    staleTime: 30000,
  });
};

export const useCreatePublisher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PublisherCreate) => createPublisher(data),
    onSuccess: () => {
      // Invalidate publishers list and dashboard stats
      queryClient.invalidateQueries({ queryKey: ["admin", "publishers"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "dashboard", "stats"],
      });
    },
  });
};

export const useUpdatePublisher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: PublisherUpdate }) =>
      updatePublisher(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "publishers"] });
    },
  });
};

export const useDeletePublisher = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePublisher(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "publishers"] });
      queryClient.invalidateQueries({
        queryKey: ["admin", "dashboard", "stats"],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
    },
  });
};
