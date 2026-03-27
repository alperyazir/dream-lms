import { createFileRoute } from "@tanstack/react-router";
import LandingPage1 from "@/components/landing/LandingPage1";

export const Route = createFileRoute("/home")({
  component: LandingPage1,
});
