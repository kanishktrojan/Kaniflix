import React from 'react';
import { cn } from '@/utils';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return <div className={cn('skeleton', className)} />;
};

// Skeleton variants
export const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-2', className)}>
    <Skeleton className="aspect-poster w-full rounded-md" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
  </div>
);

export const SkeletonHero: React.FC = () => (
  <div className="relative h-[70vh] w-full">
    <Skeleton className="absolute inset-0" />
    <div className="absolute bottom-0 left-0 p-8 md:p-16 space-y-4 w-full md:w-2/3">
      <Skeleton className="h-12 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <div className="flex gap-4 pt-4">
        <Skeleton className="h-12 w-32 rounded-md" />
        <Skeleton className="h-12 w-32 rounded-md" />
      </div>
    </div>
  </div>
);

export const SkeletonRow: React.FC<{ count?: number }> = ({ count = 6 }) => (
  <div className="space-y-4">
    <Skeleton className="h-8 w-48" />
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} className="flex-shrink-0 w-[200px]" />
      ))}
    </div>
  </div>
);

export const SkeletonDetail: React.FC = () => (
  <div className="space-y-8">
    <SkeletonHero />
    <div className="px-8 md:px-16 space-y-8">
      <div className="flex gap-8">
        <Skeleton className="w-[300px] aspect-poster rounded-lg hidden md:block" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <div className="flex gap-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <div className="flex gap-4 pt-4">
            <Skeleton className="h-12 w-32 rounded-md" />
            <Skeleton className="h-12 w-12 rounded-full" />
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </div>
      </div>
      <SkeletonRow />
    </div>
  </div>
);

export default Skeleton;
