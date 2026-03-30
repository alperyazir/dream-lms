import { createFileRoute, redirect } from "@tanstack/react-router";
import { isLoggedIn } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (isLoggedIn()) {
      // Authenticated users go to the layout which redirects to their dashboard
      return;
    }
    throw redirect({ to: "/home" });
  },
});
