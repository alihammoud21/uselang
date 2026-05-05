import type { ButtonHTMLAttributes, ReactNode } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  icon?: ReactNode;
}

export function Button({ className = "", variant = "secondary", icon, children, ...props }: Props) {
  return (
    <button className={`button button-${variant} ${className}`} {...props}>
      {icon}
      <span>{children}</span>
    </button>
  );
}
