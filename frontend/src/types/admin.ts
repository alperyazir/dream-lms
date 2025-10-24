/**
 * Admin-related TypeScript types
 */

export interface DashboardStats {
  total_publishers: number;
  total_schools: number;
  total_teachers: number;
  total_students: number;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  next_page: number | null;
  prev_page: number | null;
}

export interface Publisher {
  id: string;
  user_id: string;
  name: string;
  contact_email: string | null;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublisherCreate {
  name: string;
  contact_email?: string;
}

export interface PublisherUpdate {
  name?: string;
  contact_email?: string;
}

export interface PublisherCreateResponse {
  success: boolean;
  data: {
    id: string;
    name: string;
    temp_password: string;
  };
}

export interface School {
  id: string;
  name: string;
  publisher_id: string;
  publisher_name: string;
  address: string | null;
  contact_info: string | null;
  created_at: string;
  updated_at: string;
}

export interface SchoolCreate {
  name: string;
  publisher_id: string;
  address?: string;
  contact_info?: string;
}

export interface SchoolUpdate {
  name?: string;
  publisher_id?: string;
  address?: string;
  contact_info?: string;
}

export interface Teacher {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  school_id: string;
  school_name: string;
  publisher_id: string;
  publisher_name: string;
  subject_specialization: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  user_id: string;
  email: string;
  is_active: boolean;
  grade_level: string | null;
  parent_email: string | null;
  created_at: string;
}

export interface ListParams {
  page?: number;
  per_page?: number;
  search?: string;
  publisher_id?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
