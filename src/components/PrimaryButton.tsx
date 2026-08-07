import React from "react";

interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "reward";
}

export function PrimaryButton({ children, variant, ...props }: PrimaryButtonProps) {
  return (
    <button type="button" data-variant={variant ?? "primary"} {...props}>
      {children}
    </button>
  );
}
