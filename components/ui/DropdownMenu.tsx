'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';

interface DropdownMenuProps {
  trigger: (open: boolean) => ReactNode;
  children: ReactNode | ((api: { close: () => void; open: boolean }) => ReactNode);
  title?: string;
  className?: string;
  panelClassName?: string;
  align?: 'left' | 'right';
  minWidth?: string;
  headerRight?: ReactNode;
  footer?: ReactNode;
}

export function DropdownMenu({
  trigger,
  children,
  title,
  className,
  panelClassName,
  align = 'left',
  minWidth = 'min-w-56',
  headerRight,
  footer,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 8, // mt-2 = 8px
        left: rect.left,
      });
    }

    const handleDocumentClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleDocumentClick);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, align]);

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <div ref={triggerRef} onClick={() => setOpen((value) => !value)}>
        {trigger(open)}
      </div>

      {open && (
        <div
          className={`fixed overflow-hidden rounded-xl border border-gray-700 bg-[#0b1320] shadow-2xl shadow-black/30 z-[9999] ${minWidth} ${panelClassName ?? ''}`}
          style={{
            top: `${panelPos.top}px`,
            left: `${panelPos.left}px`,
          }}
        >
          {(title || headerRight) && (
            <div className="flex items-center justify-between border-b border-gray-700 bg-[#0f1722] px-3 py-2.5">
              <div className="text-sm font-medium text-white">{title}</div>
              <div className="text-xs uppercase tracking-wide text-gray-500">{headerRight}</div>
            </div>
          )}
          {typeof children === 'function' ? children({ close, open }) : children}
          {footer}
        </div>
      )}
    </div>
  );
}