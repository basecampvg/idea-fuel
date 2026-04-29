import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { trpc } from '../lib/trpc';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface UseNoteAutoSaveOptions {
  noteId: string;
  /** Function that returns the current content to save (can be async) */
  getContent: () => string | Promise<string>;
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
  const retryCount = useRef(0);
  const MAX_RETRIES = 2;

  const utils = trpc.useUtils();
  // IMPORTANT: use trpc.thought.* here. tRPC cache keys are per-client-path,
  // not per-server-procedure, so `note.get` vs `thought.get` are DIFFERENT
  // cache entries even though `note` is a server alias of `thought`.
  // Callers query `trpc.thought.get`, so we must invalidate that path —
  // otherwise saved content is not reflected on re-entry until staleTime
  // (5 min) expires and the query refetches.
  const updateMutation = trpc.thought.update.useMutation({
    // Optimistic cache write + snapshot. Writing the new content into
    // thought.get at mutation-start means re-entering the note before
    // the network round-trip completes shows the saved content (the
    // queryClient is configured with staleTime=5min, so without this
    // the next mount would return the old cache). We snapshot here so
    // onError can revert — otherwise a failed save leaves the UI lying.
    onMutate: async (variables) => {
      await utils.thought.get.cancel({ id: variables.id });
      const previousThought = utils.thought.get.getData({ id: variables.id });
      utils.thought.get.setData({ id: variables.id }, (prev) =>
        prev ? { ...prev, content: variables.content } : prev
      );
      return { previousThought };
    },
    onSuccess: (_data, variables) => {
      hasPendingChanges.current = false;
      retryCount.current = 0;
      lastSavedContent.current = variables.content;
      setSaveStatus('saved');
      if (savedIndicatorTimer.current) clearTimeout(savedIndicatorTimer.current);
      savedIndicatorTimer.current = setTimeout(() => setSaveStatus('idle'), 2000);
      utils.thought.get.invalidate({ id: noteId });
      utils.thought.list.invalidate();
    },
    onError: (_err, variables, context) => {
      // Revert the optimistic cache write so the UI reflects actual state.
      if (context?.previousThought !== undefined) {
        utils.thought.get.setData({ id: variables.id }, context.previousThought);
      }
      setSaveStatus('error');
      if (retryCount.current < MAX_RETRIES) {
        retryCount.current += 1;
        setTimeout(async () => {
          const content = await getContent();
          if (content !== lastSavedContent.current) {
            performSave(content);
          }
        }, 3000);
      }
    },
  });

  const performSave = useCallback((content: string) => {
    if (content === lastSavedContent.current) return;
    setSaveStatus('saving');
    updateMutation.mutate({ id: noteId, content });
  }, [noteId, updateMutation]);

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
    if (hasPendingChanges.current && !updateMutation.isPending) {
      const content = await getContent();
      performSave(content);
    }
  }, [getContent, performSave, updateMutation.isPending]);

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
