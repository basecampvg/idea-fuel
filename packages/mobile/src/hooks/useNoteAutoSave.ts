import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { trpc } from '../lib/trpc';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseNoteAutoSaveOptions {
  noteId: string;
  /** Function that returns the current content to save */
  getContent: () => string;
  /** Debounce delay in ms (default: 1500) */
  debounceMs?: number;
  /** Max interval between saves in ms (default: 30000) */
  maxIntervalMs?: number;
}

export function useNoteAutoSave({
  noteId,
  getContent,
  debounceMs = 1500,
  maxIntervalMs = 30000,
}: UseNoteAutoSaveOptions) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxIntervalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef<string>('');
  const hasPendingChanges = useRef(false);
  const savedIndicatorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();
  const updateMutation = trpc.note.update.useMutation({
    onSuccess: () => {
      hasPendingChanges.current = false;
      setSaveStatus('saved');
      if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
      savedIndicatorTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
      utils.note.get.invalidate({ id: noteId });
      utils.note.list.invalidate();
    },
    onError: () => {
      setSaveStatus('error');
      // Retry once after 3 seconds
      setTimeout(() => {
        const content = getContent();
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
    updateMutation.mutate({ id: noteId, content });
  }, [noteId, updateMutation]);

  /** Mark content as changed — triggers debounced save */
  const markDirty = useCallback(() => {
    hasPendingChanges.current = true;

    // Reset debounce timer
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      const content = getContent();
      performSave(content);
    }, debounceMs);

    // Start max interval timer if not already running
    if (!maxIntervalTimer.current) {
      maxIntervalTimer.current = setTimeout(() => {
        maxIntervalTimer.current = null;
        if (hasPendingChanges.current) {
          const content = getContent();
          performSave(content);
        }
      }, maxIntervalMs);
    }
  }, [getContent, debounceMs, maxIntervalMs, performSave]);

  /** Flush any pending changes immediately */
  const flush = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (maxIntervalTimer.current) {
      clearTimeout(maxIntervalTimer.current);
      maxIntervalTimer.current = null;
    }
    if (hasPendingChanges.current) {
      const content = getContent();
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
