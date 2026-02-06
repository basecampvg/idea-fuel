import { ProjectLayoutClient } from './components/project-layout-client';

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return <ProjectLayoutClient params={params}>{children}</ProjectLayoutClient>;
}
