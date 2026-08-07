import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  variant?: "bottomSheet" | "centeredCard";
}

export function Modal({ isOpen, onClose, children, variant }: ModalProps) {
  if (!isOpen) return null;
  return (
    <div data-variant={variant ?? "centeredCard"}>
      <div onClick={onClose} aria-hidden />
      <div>{children}</div>
    </div>
  );
}
