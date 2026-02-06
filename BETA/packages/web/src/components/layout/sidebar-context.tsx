'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

export type SidebarMode = 'collapsed' | 'expanded' | 'hover';

interface SidebarContextValue {
  mode: SidebarMode;
  isExpanded: boolean;
  isAutoCollapsed: boolean;
  setMode: (mode: SidebarMode) => void;
  sidebarWidth: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const STORAGE_KEY = 'forge_sidebar_mode';
const COLLAPSED_WIDTH = 60;
const EXPANDED_WIDTH = 240;
const HOVER_ENTER_DELAY = 200;
const HOVER_LEAVE_DELAY = 300;

const SidebarContext = createContext<SidebarContextValue | null>(null);

function isIdeaDetailRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/ideas\/[^/]+/.test(pathname) && pathname !== '/ideas';
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mode, setModeState] = useState<SidebarMode>('collapsed');
  const [hoverActive, setHoverActive] = useState(false);
  const [mounted, setMounted] = useState(false);

  const hoverEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SidebarMode | null;
    if (stored && ['collapsed', 'expanded', 'hover'].includes(stored)) {
      setModeState(stored);
    }
    // Delay mounted flag by one frame to suppress initial transition
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const setMode = useCallback((newMode: SidebarMode) => {
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const isAutoCollapsed = isIdeaDetailRoute(pathname);

  const isExpanded =
    !isAutoCollapsed &&
    (mode === 'expanded' || (mode === 'hover' && hoverActive));

  const sidebarWidth = isExpanded ? EXPANDED_WIDTH : COLLAPSED_WIDTH;

  const onMouseEnter = useCallback(() => {
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
    hoverEnterTimer.current = setTimeout(() => {
      setHoverActive(true);
    }, HOVER_ENTER_DELAY);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (hoverEnterTimer.current) {
      clearTimeout(hoverEnterTimer.current);
      hoverEnterTimer.current = null;
    }
    hoverLeaveTimer.current = setTimeout(() => {
      setHoverActive(false);
    }, HOVER_LEAVE_DELAY);
  }, []);

  // Cleanup timers
  useEffect(() => {
    return () => {
      if (hoverEnterTimer.current) clearTimeout(hoverEnterTimer.current);
      if (hoverLeaveTimer.current) clearTimeout(hoverLeaveTimer.current);
    };
  }, []);

  // Reset hover when auto-collapsed
  useEffect(() => {
    if (isAutoCollapsed) {
      setHoverActive(false);
    }
  }, [isAutoCollapsed]);

  const value: SidebarContextValue = {
    mode,
    isExpanded,
    isAutoCollapsed,
    setMode,
    sidebarWidth,
    onMouseEnter: mode === 'hover' && !isAutoCollapsed ? onMouseEnter : () => {},
    onMouseLeave: mode === 'hover' && !isAutoCollapsed ? onMouseLeave : () => {},
  };

  return (
    <SidebarContext.Provider value={value}>
      <div data-sidebar-mounted={mounted ? '' : undefined}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function useSidebar(): SidebarContextValue {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
