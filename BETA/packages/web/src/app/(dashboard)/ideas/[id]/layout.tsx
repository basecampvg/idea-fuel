import { IdeaLayoutClient } from './components/idea-layout-client';

export default function IdeaLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  return <IdeaLayoutClient params={params}>{children}</IdeaLayoutClient>;
}
