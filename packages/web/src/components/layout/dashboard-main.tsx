'use client';

import { usePathname } from 'next/navigation';
import { useSidebar, TOP_BAR_HEIGHT } from './sidebar-context';
import { useAgentSidebar, AGENT_SIDEBAR_WIDTH } from '@/components/agent/agent-sidebar-context';

export function DashboardMain({ children }: { children: React.ReactNode }) {
  const { sidebarWidth } = useSidebar();
  const { isOpen: agentOpen } = useAgentSidebar();
  const pathname = usePathname();

  // Admin routes render their own layout — no margin needed
  const isAdmin = pathname?.startsWith('/admin');
  if (isAdmin) {
    return (
      <main className="min-h-screen flex flex-col relative z-10">
        {children}
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex flex-col relative z-10 transition-[margin-left,margin-right] duration-200 ease-out motion-reduce:duration-0"
      style={{
        marginLeft: sidebarWidth,
        marginRight: agentOpen ? AGENT_SIDEBAR_WIDTH : 0,
        paddingTop: TOP_BAR_HEIGHT,
      }}
    >
      {children}
    </main>
  );
}
