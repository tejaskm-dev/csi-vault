import React from "react";
import { motion } from "motion/react";
import { settleVariants } from "../lib/motion";
import { cn } from "../lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
}

export function PageWrapper({ children, className }: PageWrapperProps) {
  return (
    <motion.div
      variants={settleVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn("flex flex-1 flex-col min-h-0", className)}
    >
      {children}
    </motion.div>
  );
}
