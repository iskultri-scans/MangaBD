"use client"

// Simplified toast hook — uses our own Toast.tsx system instead of shadcn's complex version.
// This avoids needing the deleted toast.tsx / toaster.tsx / skeleton.tsx files.

import { useCallback } from "react";
import { useToast as useAppToast } from "@/components/ui/Toast";

export type ToastVariant = "default" | "destructive" | "success";

interface ToastOptions {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

/**
 * Standalone toast function — for use outside of React components.
 * Currently a no-op since our simple Toast.tsx system requires React context.
 * Prefer using the useToast() hook inside components.
 */
function toast(_options: ToastOptions): { id: string; dismiss: () => void; update: (props: unknown) => void } {
  if (typeof console !== "undefined") {
    console.warn("[toast] Called outside a component. Use the useToast() hook inside React components instead.");
  }
  return {
    id: "noop",
    dismiss: () => {},
    update: () => {},
  };
}

/**
 * Drop-in replacement for the shadcn useToast hook.
 * Internally delegates to the simple Toast.tsx showToast function.
 */
function useToast() {
  const { showToast } = useAppToast();

  const toastCallback = useCallback(
    (options: ToastOptions) => {
      const message = options.description || options.title || "";
      const type: "success" | "error" | "info" | "warning" =
        options.variant === "destructive"
          ? "error"
          : options.variant === "success"
            ? "success"
            : "info";
      showToast(message, type);
    },
    [showToast]
  );

  const dismiss = useCallback((_toastId?: string) => {
    // No-op: our simple toast auto-dismisses after 4 seconds
  }, []);

  return {
    toasts: [] as Array<{ id: string }>,
    toast: toastCallback,
    dismiss,
  };
}

export { useToast, toast };
