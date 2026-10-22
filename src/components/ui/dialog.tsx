import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import { Button } from "./button";
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const restoreFocus = useRef<HTMLElement | null>(null);
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="dialog-overlay" />
        <D.Content
          onOpenAutoFocus={() => {
            restoreFocus.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreFocus.current?.focus();
          }}
          className={`dialog-content ${className}`}
          aria-describedby={description ? "dialog-description" : undefined}
        >
          <D.Title className="dialog-title">{title}</D.Title>
          {description && (
            <D.Description id="dialog-description" className="muted">
              {description}
            </D.Description>
          )}
          <D.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              className="dialog-close"
              aria-label="Fechar"
            >
              <X size={20} />
            </Button>
          </D.Close>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
