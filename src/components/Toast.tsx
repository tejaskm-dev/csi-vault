import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";

interface ToastProps {
  message: string;
  isVisible: boolean;
  type?: "error" | "info";
  actionText?: string;
  onAction?: () => void;
}

export function Toast({ message, isVisible, type = "error", actionText, onAction }: ToastProps) {
  if (!isVisible) return null;

  const handleAction = () => {
    playTap();
    if (onAction) onAction();
  };

  return (
    <div
      role="status"
      className={cn(
        "ink rounded-btn p-4 shadow-ink-sm flex items-center justify-between gap-4 w-full select-none",
        type === "error" ? "bg-red text-white" : "bg-blue text-white"
      )}
    >
      <span className="font-body font-bold text-[15px]">{message}</span>
      {actionText && onAction && (
        <button
          type="button"
          onClick={handleAction}
          className="ink rounded-pill px-3 py-1 bg-white text-ink text-[12px] font-extrabold uppercase tracking-wide cursor-pointer transition-[transform,box-shadow] duration-75 active:translate-x-[2px] active:translate-y-[2px] shadow-[2px_2px_0_0_#14110F] active:shadow-none"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
