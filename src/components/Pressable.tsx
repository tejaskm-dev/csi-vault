import React from "react";

interface PressableProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: boolean;
}

export function Pressable({ icon, children, ...props }: PressableProps) {
  return (
    <button type="button" data-icon={icon ? "true" : undefined} {...props}>
      {children}
    </button>
  );
}
