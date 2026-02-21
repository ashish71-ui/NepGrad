import axios from 'axios';

const API_URL = import.meta.env.VITE_USE_PROXY === 'true' 
  ? '/api' 
  : (import.meta.env.VITE_API_URL || 'http://localhost:8000/api');

const universityApi = axios.create({
  baseURL: `${API_URL}/universities`,
});

// Add auth token to requests
universityApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export interface University {
  id: number;
  name: string;
  description: string;
  logo: string | null;
  website: string;
  country: string;
  city: string;
  address: string;
  deadline: string | null;
  application_fee: number | null;
  tuition_fee: number | null;
  admission_rate: number | null;
  admission_rate_display: string | null;
  founded_year: number | null;
  university_type: string;
  university_type_display: string;
  ranking: number | null;
  ielts_score: number | null;
  toefl_score: number | null;
  gre_score: number | null;
  gmat_score: number | null;
  scholarships_available: boolean;
  scholarships_description: string;
  email: string;
  phone: string;
  is_active: boolean;
  program_count?: number;
  programs?: Program[];
  created_at: string;
  updated_at: string;
}

export interface Program {
  id: number;
  name: string;
  degree_type: string;
  duration_years: number | null;
  tuition_fee: number | null;
  intake_months: string;
  description: string;
  requirements: string;
  is_active: boolean;
}

export interface Application {
  id: number;
  university: number;
  university_name: string;
  university_country: string;
  university_city: string;
  status: string;
  status_display: string;
  notes: string;
  applied_at: string;
  updated_at: string;
}

export interface DashboardStats {
  applied_count: number;
  added_count: number;
  recent_applications: Application[];
}

export interface UniversityFilters {
  country?: string;
  city?: string;
  type?: string;
  scholarships?: boolean;
  search?: string;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const universityService = {
  // Get all universities with optional filters and pagination
  getUniversities: async (filters?: UniversityFilters): Promise<PaginatedResponse<University>> => {
    const response = await universityApi.get('/', { params: filters });
    return response.data;
  },

  // Get single university by ID
  getUniversity: async (id: number): Promise<University> => {
    const response = await universityApi.get(`/${id}/`);
    return response.data;
  },

  // Create new university (admin only)
  createUniversity: async (data: Partial<University>): Promise<University> => {
    const response = await universityApi.post('/', data);
    return response.data;
  },

  // Update university (admin only)
  updateUniversity: async (id: number, data: Partial<University>): Promise<University> => {
    const response = await universityApi.patch(`/${id}/`, data);
    return response.data;
  },

  // Delete university (admin only)
  deleteUniversity: async (id: number): Promise<void> => {
    await universityApi.delete(`/${id}/`);
  },

  // Get universities created by current user (admin)
  getMyUniversities: async (filters?: UniversityFilters): Promise<PaginatedResponse<University>> => {
    const response = await universityApi.get('/', { params: filters });
    return response.data;
  },

  // Get dashboard stats
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await universityApi.get('/dashboard-stats/');
    return response.data;
  },

  // Apply to a university
  applyToUniversity: async (universityId: number): Promise<Application> => {
    const response = await universityApi.post('/apply/', { university_id: universityId });
    return response.data;
  },

  // Get user's applications
  getMyApplications: async (): Promise<Application[]> => {
    const response = await universityApi.get('/my-applications/');
    return response.data;
  },

  // Withdraw application
  withdrawApplication: async (applicationId: number): Promise<void> => {
    await universityApi.delete(`/applications/${applicationId}/withdraw/`);
  },

  // Get all applications (for admin)
  getApplications: async (): Promise<Application[]> => {
    const response = await universityApi.get('/applications/');
    return response.data;
  },

  // Update application status
  updateApplication: async (id: number, data: Partial<Application>): Promise<Application> => {
    const response = await universityApi.patch(`/applications/${id}/`, data);
    return response.data;
  },
};

export default universityService;
