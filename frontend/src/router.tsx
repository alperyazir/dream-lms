/**
 * Application router configuration
 */
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { PublishersPage } from "./pages/admin/PublishersPage";
import { SchoolsPage } from "./pages/admin/SchoolsPage";
import { TeachersPage } from "./pages/admin/TeachersPage";
import { StudentsPage } from "./pages/admin/StudentsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/admin/dashboard" replace />,
  },
  {
    path: "/admin",
    children: [
      {
        path: "dashboard",
        element: <AdminDashboardPage />,
      },
      {
        path: "publishers",
        element: <PublishersPage />,
      },
      {
        path: "schools",
        element: <SchoolsPage />,
      },
      {
        path: "teachers",
        element: <TeachersPage />,
      },
      {
        path: "students",
        element: <StudentsPage />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/admin/dashboard" replace />,
  },
]);
