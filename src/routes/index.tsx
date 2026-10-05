import { createFileRoute } from "@tanstack/react-router";
import { ElsewhereApp } from "@/components/elsewhere/app";

export const Route = createFileRoute("/")({ component: ElsewhereApp });
