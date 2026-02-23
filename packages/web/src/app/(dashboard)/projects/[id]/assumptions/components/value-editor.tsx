'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AssumptionValueType } from '@forge/shared';

interface ValueEditorProps {
  value: string | null;
  valueType: AssumptionValueType;
  unit: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
}

function getPlaceholder(valueType: AssumptionValueType, unit: string | null): string {
  switch (valueType) {
    case 'CURRENCY': return unit === '$' ? '0.00' : '0';
    case 'PERCENTAGE': return '0';
    case 'NUMBER': return '0';
    case 'TEXT': return 'Enter value...';
    case 'DATE': return 'YYYY-MM-DD';
    case 'SELECT': return 'Select...';
    default: return 'Enter value...';
  }
}

function validateInput(val: string, valueType: AssumptionValueType): boolean {
  if (val === '') return true;
  switch (valueType) {
    case 'CURRENCY':
    case 'NUMBER':
      return /^-?\d*\.?\d*$/.test(val);
    case 'PERCENTAGE':
      return /^-?\d*\.?\d*$/.test(val);
    case 'TEXT':
      return val.length <= 1000;
    case 'DATE':
      return /^\d{0,4}(-\d{0,2}){0,2}$/.test(val);
    default:
      return true;
  }
}

export function ValueEditor({ value, valueType, unit, onChange, disabled }: ValueEditorProps) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(value ?? '');
    }
  }, [value, isFocused]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (validateInput(val, valueType)) {
      setLocalValue(val);
    }
  }, [valueType]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const trimmed = localValue.trim();
    const newValue = trimmed === '' ? null : trimmed;
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [localValue, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setLocalValue(value ?? '');
      inputRef.current?.blur();
    }
  }, [value]);

  const isNumeric = valueType === 'CURRENCY' || valueType === 'NUMBER' || valueType === 'PERCENTAGE';

  return (
    <div className="relative">
      {/* Unit prefix */}
      {unit === '$' && (
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          $
        </span>
      )}

      <input
        ref={inputRef}
        type={isNumeric ? 'text' : 'text'}
        inputMode={isNumeric ? 'decimal' : 'text'}
        value={localValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={getPlaceholder(valueType, unit)}
        disabled={disabled}
        className={`
          w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono
          transition-colors duration-100
          placeholder:text-muted-foreground/40
          focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1
          disabled:cursor-not-allowed disabled:opacity-50
          ${unit === '$' ? 'pl-7' : ''}
          ${unit === '%' ? 'pr-7' : ''}
        `}
      />

      {/* Unit suffix */}
      {(unit === '%' || unit === 'x' || unit === 'months' || unit === 'people') && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
          {unit}
        </span>
      )}
    </div>
  );
}
