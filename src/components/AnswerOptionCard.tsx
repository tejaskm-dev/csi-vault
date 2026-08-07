import React from "react";

interface AnswerOptionCardProps {
  label: string;
  icon?: React.ReactNode;
  isSelected?: boolean;
  isWrong?: boolean;
  disabled?: boolean;
  onClick: () => void;
  variant?: "text" | "image";
}

export function AnswerOptionCard({
  label,
  icon,
  isSelected,
  isWrong,
  disabled,
  onClick,
  variant,
}: AnswerOptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      data-selected={isSelected ? "true" : undefined}
      data-wrong={isWrong ? "true" : undefined}
      data-variant={variant ?? "text"}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
