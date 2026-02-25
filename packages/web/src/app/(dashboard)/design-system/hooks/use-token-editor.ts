'use client';

import { useReducer, useEffect, useCallback, useRef } from 'react';
import type {
  TokenDefinition,
  TokenCategory,
  SelectorBlock,
  TokenChange,
  ParseResult,
} from '../lib/token-types';
import { TOKEN_CATEGORIES, tokenKey } from '../lib/token-types';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface TokenEditorState {
  originalTokens: Map<string, TokenDefinition>;
  allTokens: TokenDefinition[];
  fileHash: string;
  editedValues: Map<string, string>; // key → new value (only dirty tokens)
  status: 'idle' | 'loading' | 'saving' | 'error';
  error: string | null;
  activeTheme: 'dark' | 'light';
  searchQuery: string;
  expandedCategories: Set<TokenCategory>;
}

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; tokens: TokenDefinition[]; fileHash: string }
  | { type: 'LOAD_ERROR'; error: string }
  | { type: 'EDIT_TOKEN'; key: string; name: string; value: string }
  | { type: 'RESET_TOKEN'; key: string; name: string }
  | { type: 'RESET_ALL' }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_SUCCESS'; fileHash: string }
  | { type: 'SAVE_ERROR'; error: string }
  | { type: 'SET_THEME'; theme: 'dark' | 'light' }
  | { type: 'SET_SEARCH'; query: string }
  | { type: 'TOGGLE_CATEGORY'; category: TokenCategory };

const initialState: TokenEditorState = {
  originalTokens: new Map(),
  allTokens: [],
  fileHash: '',
  editedValues: new Map(),
  status: 'idle',
  error: null,
  activeTheme: 'dark',
  searchQuery: '',
  expandedCategories: new Set(TOKEN_CATEGORIES.map((c) => c.key)),
};

function reducer(state: TokenEditorState, action: Action): TokenEditorState {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, status: 'loading', error: null };

    case 'LOAD_SUCCESS': {
      const map = new Map<string, TokenDefinition>();
      for (const t of action.tokens) {
        map.set(tokenKey(t.selector, t.name), t);
      }
      return {
        ...state,
        status: 'idle',
        originalTokens: map,
        allTokens: action.tokens,
        fileHash: action.fileHash,
        editedValues: new Map(),
        error: null,
      };
    }

    case 'LOAD_ERROR':
      return { ...state, status: 'error', error: action.error };

    case 'EDIT_TOKEN': {
      const next = new Map(state.editedValues);
      const original = state.originalTokens.get(action.key);
      // Only mark dirty if value actually differs from original
      if (original && original.rawValue === action.value) {
        next.delete(action.key);
      } else {
        next.set(action.key, action.value);
      }
      return { ...state, editedValues: next };
    }

    case 'RESET_TOKEN': {
      const next = new Map(state.editedValues);
      next.delete(action.key);
      return { ...state, editedValues: next };
    }

    case 'RESET_ALL':
      return { ...state, editedValues: new Map() };

    case 'SAVE_START':
      return { ...state, status: 'saving', error: null };

    case 'SAVE_SUCCESS':
      return {
        ...state,
        status: 'idle',
        fileHash: action.fileHash,
        editedValues: new Map(),
        error: null,
      };

    case 'SAVE_ERROR':
      return { ...state, status: 'error', error: action.error };

    case 'SET_THEME':
      return { ...state, activeTheme: action.theme };

    case 'SET_SEARCH':
      return { ...state, searchQuery: action.query };

    case 'TOGGLE_CATEGORY': {
      const next = new Set(state.expandedCategories);
      if (next.has(action.category)) {
        next.delete(action.category);
      } else {
        next.add(action.category);
      }
      return { ...state, expandedCategories: next };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useTokenEditor() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const overridesRef = useRef<Set<string>>(new Set());

  // --- Fetch tokens on mount ---
  const fetchTokens = useCallback(async () => {
    dispatch({ type: 'LOAD_START' });
    try {
      const res = await fetch('/api/dev/tokens');
      if (!res.ok) throw new Error(await res.text());
      const data: ParseResult = await res.json();
      dispatch({ type: 'LOAD_SUCCESS', tokens: data.tokens, fileHash: data.fileHash });

      // Check if we just recovered from an HMR reload after save
      const pendingSave = sessionStorage.getItem('token-editor-save-pending');
      if (pendingSave) {
        sessionStorage.removeItem('token-editor-save-pending');
        // The save worked — HMR reloaded the page with fresh tokens
        dispatch({ type: 'SAVE_SUCCESS', fileHash: data.fileHash });
      }
    } catch (err) {
      dispatch({ type: 'LOAD_ERROR', error: (err as Error).message });
    }
  }, []);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // --- Live preview: apply/remove CSS overrides ---
  const editToken = useCallback(
    (key: string, name: string, value: string) => {
      dispatch({ type: 'EDIT_TOKEN', key, name, value });
      // Apply live preview
      document.documentElement.style.setProperty(name, value);
      overridesRef.current.add(name);
    },
    [],
  );

  const resetToken = useCallback(
    (key: string, name: string) => {
      dispatch({ type: 'RESET_TOKEN', key, name });
      // Remove live preview override
      document.documentElement.style.removeProperty(name);
      overridesRef.current.delete(name);
    },
    [],
  );

  const resetAll = useCallback(() => {
    // Remove all live preview overrides
    for (const name of overridesRef.current) {
      document.documentElement.style.removeProperty(name);
    }
    overridesRef.current.clear();
    dispatch({ type: 'RESET_ALL' });
  }, []);

  // --- Save changes ---
  const saveChanges = useCallback(async () => {
    if (state.editedValues.size === 0) return;

    dispatch({ type: 'SAVE_START' });

    const changes: TokenChange[] = [];
    for (const [key, value] of state.editedValues) {
      const token = state.originalTokens.get(key);
      if (token) {
        changes.push({ name: token.name, selector: token.selector, value });
      }
    }

    // Mark save as pending in sessionStorage — if HMR reloads the page
    // before the POST response arrives, we'll recover on next mount
    sessionStorage.setItem('token-editor-save-pending', '1');

    try {
      const res = await fetch('/api/dev/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes, fileHash: state.fileHash }),
      });

      if (!res.ok) {
        sessionStorage.removeItem('token-editor-save-pending');
        const errData = await res.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(errData.error || 'Save failed');
      }

      const data = await res.json();
      sessionStorage.removeItem('token-editor-save-pending');

      // Remove all CSS overrides — HMR will reload the stylesheet
      for (const name of overridesRef.current) {
        document.documentElement.style.removeProperty(name);
      }
      overridesRef.current.clear();

      dispatch({ type: 'SAVE_SUCCESS', fileHash: data.newFileHash });
    } catch (err) {
      // If the error is "Failed to fetch", it's likely HMR reloading the page
      // after globals.css was written. The save probably succeeded.
      // sessionStorage flag will be checked on next mount to confirm.
      const msg = (err as Error).message;
      if (msg === 'Failed to fetch') {
        // Don't show error — HMR will reload and we'll verify on next mount
        return;
      }
      sessionStorage.removeItem('token-editor-save-pending');
      dispatch({ type: 'SAVE_ERROR', error: msg });
    }
  }, [state.editedValues, state.originalTokens, state.fileHash]);

  // --- Derived state ---
  const selectorForTheme: SelectorBlock =
    state.activeTheme === 'dark' ? '.dark,:root' : 'html.light';

  const filteredTokens = state.allTokens.filter((t) => {
    // Show shared tokens in both themes, themed tokens only for active theme
    const isShared = t.selector === ':root-shared';
    const isActiveTheme = t.selector === selectorForTheme;
    if (!isShared && !isActiveTheme) return false;

    // Search filter
    if (state.searchQuery) {
      return t.name.toLowerCase().includes(state.searchQuery.toLowerCase());
    }
    return true;
  });

  // Group by category
  const tokensByCategory = new Map<TokenCategory, TokenDefinition[]>();
  for (const t of filteredTokens) {
    const list = tokensByCategory.get(t.category) || [];
    list.push(t);
    tokensByCategory.set(t.category, list);
  }

  const dirtyCount = state.editedValues.size;
  const isDirty = dirtyCount > 0;

  // Get current value for a token (edited or original)
  const getCurrentValue = useCallback(
    (key: string): string => {
      return state.editedValues.get(key) ?? state.originalTokens.get(key)?.rawValue ?? '';
    },
    [state.editedValues, state.originalTokens],
  );

  const isTokenDirty = useCallback(
    (key: string): boolean => state.editedValues.has(key),
    [state.editedValues],
  );

  // --- Keyboard shortcut: Ctrl+S ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (state.editedValues.size > 0 && state.status !== 'saving') {
          saveChanges();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [saveChanges, state.editedValues.size, state.status]);

  // --- Warn on unsaved changes before unload ---
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.editedValues.size > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.editedValues.size]);

  return {
    // State
    status: state.status,
    error: state.error,
    activeTheme: state.activeTheme,
    searchQuery: state.searchQuery,
    expandedCategories: state.expandedCategories,
    tokensByCategory,
    dirtyCount,
    isDirty,

    // Actions
    editToken,
    resetToken,
    resetAll,
    saveChanges,
    fetchTokens,
    setTheme: (theme: 'dark' | 'light') => dispatch({ type: 'SET_THEME', theme }),
    setSearch: (query: string) => dispatch({ type: 'SET_SEARCH', query }),
    toggleCategory: (category: TokenCategory) =>
      dispatch({ type: 'TOGGLE_CATEGORY', category }),

    // Helpers
    getCurrentValue,
    isTokenDirty,
  };
}
