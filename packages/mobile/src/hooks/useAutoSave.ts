import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { trpc } from '../lib/trpc';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  projectId: string;
  /** Function that returns the current content to save (can be async) */
  getContent: () => string | Promise<string>;
  /** Debounce delay in ms (default: 1500) */
  debounceMs?: number;
  /** Max interval between saves in ms (default: 30000) */
  maxIntervalMs?: number;
  /** Field to save to (default: 'notes') */
  field?: 'notes' | 'title';
}

export function useAutoSave({
  projectId,
  getContent,
  debounceMs = 1500,
  maxIntervalMs = 30000,
  field = 'notes',
}: UseAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxIntervalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef<string>('');
  const hasPendingChanges = useRef(false);
  const savedIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();
  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      hasPendingChanges.current = false;
      setSaveStatus('saved');
      if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
      savedIndicatorTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
      // Invalidate project cache so other screens see the update
      utils.project.get.invalidate({ id: projectId });
      utils.project.list.invalidate();
    },
    onError: () => {
      setSaveStatus('error');
      // Retry once after 3 seconds
      setTimeout(async () => {
        const content = await getContent();
        if (content !== lastSavedContent.current) {
          performSave(content);
        }
      }, 3000);
    },
  });

  const performSave = useCallback((content: string) => {
    if (content === lastSavedContent.current) return;
    lastSavedContent.current = content;
    setSaveStatus('saving');
    updateMutation.mutate({
      id: projectId,
      data: { [field]: content },
    });
  }, [projectId, field, updateMutation]);

  /** Mark content as changed — triggers debounced save */
  const markDirty = useCallback(() => {
    hasPendingChanges.current = true;

    // Reset debounce timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      const content = await getContent();
      performSave(content);
    }, debounceMs);

    // Start max interval timer if not already running
    if (!maxIntervalTimer.current) {
      maxIntervalTimer.current = setTimeout(async () => {
        maxIntervalTimer.current = null;
        if (hasPendingChanges.current) {
          const content = await getContent();
          performSave(content);
        }
      }, maxIntervalMs);
    }
  }, [getContent, debounceMs, maxIntervalMs, performSave]);

  /** Flush any pending changes immediately */
  const flush = useCallback(async () => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (maxIntervalTimer.current) {
      clearTimeout(maxIntervalTimer.current);
      maxIntervalTimer.current = null;
    }
    if (hasPendingChanges.current) {
      const content = await getContent();
      performSave(content);
    }
  }, [getContent, performSave]);

  /** Set the initial content (so we don't save unchanged content) */
  const setInitialContent = useCallback((content: string) => {
    lastSavedContent.current = content;
  }, []);

  // Flush on app background
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'background' || nextState === 'inactive') {
        flush();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      // Cleanup timers
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      if (maxIntervalTimer.current) clearTimeout(maxIntervalTimer.current);
      if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
    };
  }, [flush]);

  return {
    saveStatus,
    markDirty,
    flush,
    setInitialContent,
  };
}
