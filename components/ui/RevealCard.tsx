"use client";

import { useReveal } from "@/hooks/useReveal";
import type { ReactNode } from "react";

type RevealCardProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function RevealCard({ children, className = "", delay = 0 }: RevealCardProps) {
  const ref = useReveal<HTMLDivElement>(delay);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
