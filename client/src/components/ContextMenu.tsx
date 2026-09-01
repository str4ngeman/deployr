import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export interface ContextMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ x, y, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const rect = menu.getBoundingClientRect();
    const adjustedX = x + rect.width > window.innerWidth ? x - rect.width : x;
    const adjustedY = y + rect.height > window.innerHeight ? y - rect.height : y;
    menu.style.left = `${Math.max(0, adjustedX)}px`;
    menu.style.top = `${Math.max(0, adjustedY)}px`;
  }, [x, y]);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[160px] py-1 rounded-md border border-border bg-surface-raised shadow-lg"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div key={i} className="my-1 border-t border-border" />
        ) : (
          <button
            key={i}
            disabled={item.disabled}
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full px-3 py-1.5 text-left text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              item.danger
                ? "text-danger hover:bg-danger/10"
                : "text-text hover:bg-surface-overlay"
            }`}
          >
            {item.label}
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}
