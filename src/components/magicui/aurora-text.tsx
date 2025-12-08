"use client";

import { cn } from "@/lib/utils";
import { motion, MotionProps } from "motion/react";
import React from "react";

interface AuroraTextProps
  extends Omit<React.HTMLAttributes<HTMLElement>, keyof MotionProps> {
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
}

export function AuroraText({
  className,
  children,
  as: Component = "span",
  ...props
}: AuroraTextProps) {
  const MotionComponent = motion.create(Component);

  return (
    <MotionComponent
      className={cn(
        "inline-block bg-gradient-to-r from-[hsl(var(--color-1))] via-[hsl(var(--color-2))] via-[hsl(var(--color-3))] to-[hsl(var(--color-4))] bg-[length:200%_auto] bg-clip-text text-transparent animate-gradient",
        className
      )}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
