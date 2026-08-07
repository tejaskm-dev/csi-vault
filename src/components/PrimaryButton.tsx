import React from "react";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "reward";
}

export function PrimaryButton({ children, variant = "primary", className, onClick, ...props }: PrimaryButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playTap();
    if (onClick) onClick(e);
  };

  const variantClasses = {
    primary: "bg-red text-white",
    secondary: "bg-paper-deep text-ink",
    reward: "bg-yellow text-ink",
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "ink tap rounded-btn font-display font-extrabold text-[18px] uppercase tracking-wide px-6 py-3 select-none transition-[transform,box-shadow] duration-75 shadow-ink active:translate-x-[5px] active:translate-y-[5px] active:shadow-ink-none disabled:opacity-40 disabled:pointer-events-none cursor-pointer flex items-center justify-center gap-2",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
