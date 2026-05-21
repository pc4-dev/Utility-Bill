import React from 'react';
import { cn } from '../../utils';

interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'circle' | 'card';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, variant = 'default' }) => {
  return (
    <div
      className={cn(
        "animate-pulse bg-gray-200 dark:bg-slate-800 transition-colors",
        variant === 'circle' && "rounded-full",
        variant === 'card' && "rounded-3xl",
        variant === 'default' && "rounded-md",
        className
      )}
    />
  );
};
