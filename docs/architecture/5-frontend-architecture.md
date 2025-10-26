# 5. Frontend Architecture

## 5.1 Project Structure

Dream LMS follows the FastAPI template's organization with `/backend` and `/frontend` as separate root directories:

```
dream-lms/
├── backend/                     # FastAPI application
│   ├── app/
│   │   ├── main.py              # FastAPI app initialization
│   │   ├── api/                 # API routers
│   │   │   ├── routes/          # Endpoint definitions
│   │   │   └── deps.py          # Dependencies (auth, db)
│   │   ├── core/                # Core configuration
│   │   │   ├── config.py        # Settings
│   │   │   └── security.py      # JWT, hashing
│   │   ├── models/              # SQLModel models
│   │   ├── schemas/             # Pydantic schemas
│   │   ├── services/            # Business logic layer
│   │   └── tests/               # Pytest tests
│   ├── alembic/                 # Database migrations
│   ├── Dockerfile
│   └── requirements.txt
│
├── frontend/                    # React application
│   ├── src/
│   │   ├── main.tsx             # Entry point
│   │   ├── App.tsx              # Root component
│   │   ├── router.tsx           # TanStack Router config
│   │   │
│   │   ├── components/          # Shared components
│   │   │   ├── ui/              # Shadcn UI primitives
│   │   │   ├── layout/          # Header, Sidebar, AppShell
│   │   │   ├── common/          # Badge, Avatar, StatCard
│   │   │   ├── forms/           # FormField, DatePicker, FileUpload
│   │   │   ├── charts/          # Recharts wrappers
│   │   │   └── notifications/   # NotificationBell, NotificationList
│   │   │
│   │   ├── features/            # Feature modules
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── assignments/
│   │   │   ├── activities/      # Activity players
│   │   │   ├── analytics/
│   │   │   └── messaging/
│   │   │
│   │   ├── pages/               # Route pages
│   │   ├── hooks/               # Custom hooks
│   │   ├── services/            # API clients
│   │   ├── stores/              # Zustand stores (optional)
│   │   ├── lib/                 # Utilities
│   │   ├── types/               # TypeScript types
│   │   └── styles/              # Global CSS
│   ├── Dockerfile
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml           # Orchestration config
├── .env                         # Environment variables
└── README.md
```

## 5.2 State Management

**Server State (TanStack Query):**

```typescript
// hooks/useAssignments.ts
export function useAssignments() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => assignmentService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const createMutation = useMutation({
    mutationFn: assignmentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries(['assignments']);
      toast.success('Assignment created!');
    },
  });

  return {
    assignments: data ?? [],
    isLoading,
    createAssignment: createMutation.mutate,
  };
}
```

**Client State (Zustand):**

```typescript
// stores/authStore.ts
interface AuthState {
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),

  login: async (credentials) => {
    const { user, access_token } = await authService.login(credentials);
    localStorage.setItem('token', access_token);
    set({ user, token: access_token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null });
  },
}));
```

## 5.3 Routing & Protected Routes

```typescript
// router.tsx
const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: 'dashboard', element: <DashboardPage /> },
          { path: 'assignments', element: <AssignmentsPage /> },
          { path: 'assignments/:id/play', element: <PlayActivityPage /> },
          // Role-specific routes
          {
            path: 'admin',
            element: <RoleGuard requiredRole="admin" />,
            children: [...]
          },
        ],
      },
    ],
  },
]);

// Protected route wrapper
function ProtectedRoute() {
  const { token } = useAuthStore();
  return token ? <Outlet /> : <Navigate to="/login" />;
}

// Role guard
function RoleGuard({ requiredRole, children }: Props) {
  const { user } = useAuthStore();
  return user?.role === requiredRole ? children : <Navigate to="/dashboard" />;
}
```

## 5.4 API Service Layer

```typescript
// services/api.ts
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 30000,
});

// Request interceptor: Add JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors
api.interceptors.response.use(
  (response) => response.data.data, // Unwrap { success, data }
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    throw error;
  }
);

// services/assignmentService.ts
export const assignmentService = {
  getAll: () => api.get<Assignment[]>('/assignments'),
  getById: (id: string) => api.get<Assignment>(`/assignments/${id}`),
  create: (data: AssignmentCreate) => api.post<Assignment>('/assignments', data),
  start: (id: string) => api.get<ActivityConfig>(`/assignments/${id}/start`),
  submit: (id: string, data: SubmitData) => api.post(`/assignments/${id}/submit`, data),
};
```

---
