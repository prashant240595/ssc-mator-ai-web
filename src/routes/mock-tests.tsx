import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/mock-tests")({
  beforeLoad: () => {
    throw redirect({ to: "/exams" });
  },
});
