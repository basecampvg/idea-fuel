'use client';

import { useState, useCallback } from 'react';
import { Plus, X } from 'lucide-react';

interface AddSubAssumptionFormProps {
  parentId: string;
  projectId: string;
  onAdd: (data: { name: string; key: string; value: string; valueType: string }) => void;
  onCancel: () => void;
}

export function AddSubAssumptionForm({ onAdd, onCancel }: AddSubAssumptionFormProps) {
  const [name, setName] = useState('');
  const [value, setValue] = useState('');

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Auto-generate key from name
    const key = name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .slice(0, 64);

    onAdd({
      name: name.trim(),
      key,
      value: value || '0',
      valueType: 'NUMBER',
    });

    setName('');
    setValue('');
  }, [name, value, onAdd]);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-md">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name (e.g. Tier A Price)"
        autoFocus
        className="flex-1 min-w-0 text-xs bg-background border border-input rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Value"
        className="w-20 text-right text-xs font-mono bg-background border border-input rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/50"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        className="p-1 rounded text-primary hover:bg-primary/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Add"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        title="Cancel"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </form>
  );
}
