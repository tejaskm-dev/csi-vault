import React from "react";
import { playTap } from "../lib/sound";
import { cn } from "../lib/utils";

interface PressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: boolean;
}

export function Pressable({ icon, children, className, onClick, ...props }: PressableProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playTap();
    if (onClick) onClick(e);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "ink tap select-none transition-[transform,box-shadow] duration-75 flex items-center justify-center cursor-pointer font-bold disabled:opacity-40 disabled:pointer-events-none text-ink bg-paper-deep shadow-ink-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-ink-none",
        icon 
          ? "rounded-btn p-3 aspect-square" 
          : "rounded-pill px-5 py-2 text-[14px] uppercase tracking-wider",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
