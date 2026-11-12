import React, { useRef, useState } from 'react';

import { Box } from '@mantine/core';

import { MIN_DRAG_TRAVEL, resizedColumnWidth } from './columnResize';

type Drag = {
  readonly th: HTMLElement;
  readonly startX: number;
  readonly startWidth: number;
  readonly startInline: string;

  readonly table: HTMLElement | null;
  readonly startTable: number;
  readonly startTableInline: string;

  readonly snapshot: Record<string, number>;
  travel: number;
};

export function DataTableColumnResize({
  columnKey,
  label,
  onChange,
}: {
  readonly columnKey: string;
  readonly label?: string;
  readonly onChange: (key: string, width: number | null, snapshot?: Record<string, number>) => void;
}) {
  const drag = useRef<Drag | null>(null);

  const [hover, setHover] = useState(false);
  const [pressed, setPressed] = useState(false);

  const restore = (d: Drag) => {
    d.th.style.width = d.startInline;
    if (d.table) d.table.style.width = d.startTableInline;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const th = e.currentTarget.closest('th');
    if (!th) return;
    e.stopPropagation();
    e.preventDefault();
    const table = th.closest('table');
    const snapshot: Record<string, number> = {};
    th.parentElement?.querySelectorAll<HTMLElement>('th[data-column-key]').forEach((el) => {
      snapshot[el.dataset.columnKey!] = Math.round(el.getBoundingClientRect().width);
    });
    drag.current = {
      th,
      startX: e.clientX,
      startWidth: th.getBoundingClientRect().width,
      startInline: th.style.width,
      table,
      startTable: table ? table.getBoundingClientRect().width : 0,
      startTableInline: table ? table.style.width : '',
      snapshot,
      travel: 0,
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setPressed(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    d.travel = e.clientX - d.startX;
    const asked = resizedColumnWidth(d.startWidth, d.travel);
    d.th.style.width = `${asked}px`;

    if (d.table && d.table.style.tableLayout === 'fixed') {
      d.table.style.width = `${d.startTable + (asked - d.startWidth)}px`;
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setPressed(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (Math.abs(d.travel) < MIN_DRAG_TRAVEL) {
      restore(d);
      return;
    }
    onChange(columnKey, resizedColumnWidth(d.startWidth, d.travel), d.snapshot);
  };

  const cancel = () => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    setPressed(false);
    restore(d);
  };

  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={label}
      data-column-resize={columnKey}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      onDoubleClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(columnKey, null);
      }}
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: 8,
        cursor: 'col-resize',
        touchAction: 'none',
        userSelect: 'none',
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
    >
      {(hover || pressed) && (
        <Box
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            right: 0,
            width: 2,
            background: 'var(--mantine-primary-color-filled)',
            pointerEvents: 'none',
          }}
        />
      )}
    </Box>
  );
}
