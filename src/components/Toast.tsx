interface ToastProps {
  message: string;
  isVisible: boolean;
  type?: "error" | "info";
  actionText?: string;
  onAction?: () => void;
}

/** Inline status. The incorrect-answer state must never become its own route. */
export function Toast({ message, isVisible, type, actionText, onAction }: ToastProps) {
  if (!isVisible) return null;
  return (
    <div role="status" data-type={type ?? "error"}>
      <span>{message}</span>
      {actionText && onAction && (
        <button type="button" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}
