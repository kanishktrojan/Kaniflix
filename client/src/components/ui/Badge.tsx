import React from 'react';
import { cn } from '@/utils';

interface BadgeProps {
  variant?: 'default' | 'rating' | 'new' | 'hd' | 'genre' | 'secondary' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  className?: string;
}

const variants = {
  default: 'bg-surface text-text-secondary',
  rating: 'bg-warning/20 text-warning',
  new: 'bg-primary text-white',
  hd: 'bg-surface border border-text-muted text-text-secondary',
  genre: 'bg-surface/50 text-text-secondary hover:bg-surface transition-colors',
  secondary: 'bg-white/10 text-text-muted',
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  danger: 'bg-red-500/20 text-red-400',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  children,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};

// Rating badge with star icon
export const RatingBadge: React.FC<{ rating: number; className?: string }> = ({
  rating,
  className,
}) => {
  return (
    <Badge variant="rating" className={className}>
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
      {rating.toFixed(1)}
    </Badge>
  );
};

// Match percentage badge (Netflix style)
export const MatchBadge: React.FC<{ percentage: number; className?: string }> = ({
  percentage,
  className,
}) => {
  const color = percentage >= 70 ? 'text-success' : percentage >= 50 ? 'text-warning' : 'text-text-muted';
  
  return (
    <span className={cn('text-sm font-bold', color, className)}>
      {percentage}% Match
    </span>
  );
};

export default Badge;
