import { lazy, Suspense, type ComponentProps } from "react";
import type { Dialog as DialogComponent } from "./ui/dialog";
const Content = lazy(() =>
  import("./ui/dialog").then((module) => ({ default: module.Dialog })),
);
export function Dialog(props: ComponentProps<typeof DialogComponent>) {
  if (!props.open) return null;
  return (
    <Suspense
      fallback={
        <div
          className="dialog-overlay"
          role="status"
          aria-label="Abrindo diálogo"
        />
      }
    >
      <Content {...props} />
    </Suspense>
  );
}
