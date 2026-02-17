'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';

interface AgentSidebarContextValue {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
}

export const AGENT_SIDEBAR_WIDTH = 400;

const AgentSidebarContext = createContext<AgentSidebarContextValue | null>(null);

export function AgentSidebarProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  // Keyboard shortcut: Cmd+J / Ctrl+J to toggle
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        toggle();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  const value = useMemo<AgentSidebarContextValue>(
    () => ({ isOpen, toggle, open, close, projectId, setProjectId }),
    [isOpen, toggle, open, close, projectId, setProjectId]
  );

  return (
    <AgentSidebarContext.Provider value={value}>
      {children}
    </AgentSidebarContext.Provider>
  );
}

export function useAgentSidebar(): AgentSidebarContextValue {
  const context = useContext(AgentSidebarContext);
  if (!context) {
    throw new Error('useAgentSidebar must be used within AgentSidebarProvider');
  }
  return context;
}
