/**
 * Admin API service
 * All API calls for admin user management functionality
 */
import apiClient from "../lib/apiClient";
import type {
  DashboardStats,
  ListParams,
  PaginatedResponse,
  Publisher,
  PublisherCreate,
  PublisherCreateResponse,
  PublisherUpdate,
  School,
  SchoolCreate,
  SchoolUpdate,
  Student,
  Teacher,
} from "../types/admin";

const ADMIN_BASE = "/api/v1/admin";

/**
 * Dashboard
 */
export const getStats = async (): Promise<DashboardStats> => {
  const response = await apiClient.get<DashboardStats>(
    `${ADMIN_BASE}/dashboard/stats`,
  );
  return response.data;
};

/**
 * Publishers
 */
export const getPublishers = async (
  params: ListParams = {},
): Promise<PaginatedResponse<Publisher>> => {
  const { page = 1, per_page = 20, search } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    per_page: per_page.toString(),
    ...(search && { search }),
  });

  const response = await apiClient.get<PaginatedResponse<Publisher>>(
    `${ADMIN_BASE}/publishers?${queryParams}`,
  );
  return response.data;
};

export const createPublisher = async (
  data: PublisherCreate,
): Promise<PublisherCreateResponse["data"]> => {
  const response = await apiClient.post<PublisherCreateResponse["data"]>(
    `${ADMIN_BASE}/publishers`,
    data,
  );
  return response.data;
};

export const updatePublisher = async (
  id: string,
  data: PublisherUpdate,
): Promise<Publisher> => {
  const response = await apiClient.put<Publisher>(
    `${ADMIN_BASE}/publishers/${id}`,
    data,
  );
  return response.data;
};

export const deletePublisher = async (id: string): Promise<void> => {
  await apiClient.delete(`${ADMIN_BASE}/publishers/${id}`);
};

/**
 * Schools
 */
export const getSchools = async (
  params: ListParams = {},
): Promise<PaginatedResponse<School>> => {
  const { page = 1, per_page = 20, search, publisher_id } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    per_page: per_page.toString(),
    ...(search && { search }),
    ...(publisher_id && { publisher_id }),
  });

  const response = await apiClient.get<PaginatedResponse<School>>(
    `${ADMIN_BASE}/schools?${queryParams}`,
  );
  return response.data;
};

export const createSchool = async (data: SchoolCreate): Promise<School> => {
  const response = await apiClient.post<School>(`${ADMIN_BASE}/schools`, data);
  return response.data;
};

export const updateSchool = async (
  id: string,
  data: SchoolUpdate,
): Promise<School> => {
  const response = await apiClient.put<School>(
    `${ADMIN_BASE}/schools/${id}`,
    data,
  );
  return response.data;
};

export const deleteSchool = async (id: string): Promise<void> => {
  await apiClient.delete(`${ADMIN_BASE}/schools/${id}`);
};

/**
 * Teachers (read-only)
 */
export const getTeachers = async (
  params: ListParams = {},
): Promise<PaginatedResponse<Teacher>> => {
  const { page = 1, per_page = 20, search } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    per_page: per_page.toString(),
    ...(search && { search }),
  });

  const response = await apiClient.get<PaginatedResponse<Teacher>>(
    `${ADMIN_BASE}/teachers?${queryParams}`,
  );
  return response.data;
};

/**
 * Students (read-only)
 */
export const getStudents = async (
  params: ListParams = {},
): Promise<PaginatedResponse<Student>> => {
  const { page = 1, per_page = 20, search } = params;
  const queryParams = new URLSearchParams({
    page: page.toString(),
    per_page: per_page.toString(),
    ...(search && { search }),
  });

  const response = await apiClient.get<PaginatedResponse<Student>>(
    `${ADMIN_BASE}/students?${queryParams}`,
  );
  return response.data;
};
