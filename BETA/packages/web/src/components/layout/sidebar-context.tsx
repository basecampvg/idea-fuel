'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
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

/** Height of the global top navigation bar in pixels */
export const TOP_BAR_HEIGHT = 48;
const HOVER_ENTER_DELAY = 200;
const HOVER_LEAVE_DELAY = 300;

const SidebarContext = createContext<SidebarContextValue | null>(null);

// Stable no-op to avoid creating new closures every render
const noop = () => {};

function isIdeaDetailRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/ideas\/[^/]+/.test(pathname) && pathname !== '/ideas';
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mode, setModeState] = useState<SidebarMode>('collapsed');
  const [hoverActive, setHoverActive] = useState(false);
  const hoverEnterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as SidebarMode | null;
    if (stored && ['collapsed', 'expanded', 'hover'].includes(stored)) {
      setModeState(stored);
    }
  }, []);

  // Clear any pending hover timers
  const clearHoverTimers = useCallback(() => {
    if (hoverEnterTimer.current) {
      clearTimeout(hoverEnterTimer.current);
      hoverEnterTimer.current = null;
    }
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
  }, []);

  const setMode = useCallback((newMode: SidebarMode) => {
    // Clear pending timers to prevent stale hover state after mode change
    clearHoverTimers();
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
    // When switching to hover mode the mouse is already inside the sidebar
    // (user just clicked the mode selector), so activate hover immediately
    if (newMode === 'hover') {
      setHoverActive(true);
    } else {
      setHoverActive(false);
    }
  }, [clearHoverTimers]);

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

  // Cleanup timers on unmount
  useEffect(() => {
    return clearHoverTimers;
  }, [clearHoverTimers]);

  // Reset hover when auto-collapsed
  useEffect(() => {
    if (isAutoCollapsed) {
      clearHoverTimers();
      setHoverActive(false);
    }
  }, [isAutoCollapsed, clearHoverTimers]);

  const hoverEnabled = mode === 'hover' && !isAutoCollapsed;

  const value = useMemo<SidebarContextValue>(() => ({
    mode,
    isExpanded,
    isAutoCollapsed,
    setMode,
    sidebarWidth,
    onMouseEnter: hoverEnabled ? onMouseEnter : noop,
    onMouseLeave: hoverEnabled ? onMouseLeave : noop,
  }), [mode, isExpanded, isAutoCollapsed, setMode, sidebarWidth, hoverEnabled, onMouseEnter, onMouseLeave]);

  return (
    <SidebarContext.Provider value={value}>
      {children}
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
