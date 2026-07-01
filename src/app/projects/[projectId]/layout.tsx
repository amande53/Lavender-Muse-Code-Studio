import { ProjectIdLayout } from "@/features/projects/components/project-id-layout";
import type { Id } from "@/convex/_generated/dataModel";

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectIdLayout
    projectId={projectId as Id<"projects">}
  >
    {children}
  </ProjectIdLayout>;
}
