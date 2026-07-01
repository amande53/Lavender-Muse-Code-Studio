import type { Id } from "@/convex/_generated/dataModel";
import { ProjectIdLayout } from "@/features/projects/components/project-id-layout";
import { notFound } from "next/navigation";

const PROJECT_ID_PATTERN = /^[a-z0-9]+$/;

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  if (!PROJECT_ID_PATTERN.test(projectId)) {
    notFound();
  }

  return <ProjectIdLayout projectId={projectId as Id<"projects">}>{children}</ProjectIdLayout>;
}
