import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/recover-password")({
  component: () => <Navigate to="/login" />,
});
