import type * as React from "react"
import { toast as toastManager } from "@/components/ui/toast"

/**
 * react-hot-toast-compatible facade over Base UI's real toast manager
 * (`src/components/ui/toast.tsx`), so the ~260 existing call sites across
 * the app didn't need to change beyond their import path. Only the small
 * number of call sites using react-hot-toast features Base UI doesn't have
 * 1:1 (custom `icon`, per-call `position`) needed a real rewrite - see
 * DESIGN.md's Toast entry for what changed and why.
 */

export interface ToastOptions {
  duration?: number
  id?: string
  /** Only meaningful on the bare `toast(message, opts)` form - success/error/loading already imply their own type. */
  type?: "info" | "warning"
}

type ToastContent = React.ReactNode | ((t: { id: string }) => React.ReactNode)

function resolveContent(message: ToastContent, liveId: { id: string }): React.ReactNode {
  return typeof message === "function" ? message(liveId) : message
}

function add(type: string | undefined, message: ToastContent, options?: ToastOptions): string {
  // `liveId` is mutated below once the real id is known, so a message
  // callback (react-hot-toast's `toast.error((t) => ...)` pattern) can
  // close over a stable object and still read the correct `t.id` even
  // though it's rendered before `toastManager.add` returns an id.
  const liveId: { id: string } = { id: options?.id ?? "" }
  const id = toastManager.add({
    id: options?.id,
    type,
    description: resolveContent(message, liveId),
    timeout: options?.duration,
  })
  liveId.id = id
  return id
}

function toast(message: ToastContent, options?: ToastOptions): string {
  return add(options?.type, message, options)
}

toast.success = (message: ToastContent, options?: ToastOptions) => add("success", message, options)
toast.error = (message: ToastContent, options?: ToastOptions) => add("error", message, options)
toast.loading = (message: ToastContent, options?: ToastOptions) => add("loading", message, options)
toast.dismiss = (id?: string) => toastManager.close(id)

export { toast }
export default toast
