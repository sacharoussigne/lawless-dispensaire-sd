'use client';

import { useCallback, useRef, useState } from 'react';
import classes from '../agenda.module.scss';

interface InlineNoteInputProps {
  placeholder: string;
  onSubmit: (value: string) => void | Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function InlineNoteInput({
  placeholder,
  onSubmit,
  disabled,
  className,
}: InlineNoteInputProps) {
  const [active, setActive] = useState(false);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const skipBlurCommit = useRef(false);

  const activate = () => {
    if (disabled) return;
    setActive(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const commit = useCallback(async () => {
    const trimmed = value.trim();
    setActive(false);
    setValue('');
    if (trimmed) {
      await onSubmit(trimmed);
    }
  }, [value, onSubmit]);

  const cancel = () => {
    setActive(false);
    setValue('');
  };

  if (!active) {
    return (
      <button
        type="button"
        className={`${classes.inlineNotePlaceholder} ${className ?? ''}`}
        onClick={activate}
        disabled={disabled}
      >
        {placeholder}
      </button>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      className={`${classes.inlineNoteInput} ${className ?? ''}`}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (skipBlurCommit.current) {
          skipBlurCommit.current = false;
          return;
        }
        void commit();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          skipBlurCommit.current = true;
          void commit();
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          skipBlurCommit.current = true;
          cancel();
        }
      }}
      placeholder={placeholder}
    />
  );
}
