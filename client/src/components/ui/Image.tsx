import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Film, Tv, ImageOff } from 'lucide-react';
import { cn } from '@/utils';

interface ImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  fallback?: string;
  aspectRatio?: 'poster' | 'backdrop' | 'square' | 'auto';
  type?: 'movie' | 'tv' | 'person';
}

// Placeholder component for missing images
const ImagePlaceholder: React.FC<{
  aspectRatio: 'poster' | 'backdrop' | 'square' | 'auto';
  type?: 'movie' | 'tv' | 'person';
  title?: string;
}> = ({ aspectRatio, type, title }) => {
  const Icon = type === 'tv' ? Tv : type === 'movie' ? Film : ImageOff;
  
  return (
    <div className={cn(
      'absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900',
      'flex flex-col items-center justify-center text-white/40'
    )}>
      <Icon className={cn(
        aspectRatio === 'poster' ? 'w-12 h-12' : 'w-16 h-16',
        'mb-2'
      )} />
      <span className={cn(
        'text-center px-4 font-medium',
        aspectRatio === 'poster' ? 'text-xs' : 'text-sm'
      )}>
        {title || 'No Image Available'}
      </span>
    </div>
  );
};

export const Image: React.FC<ImageProps> = ({
  src,
  alt,
  className,
  aspectRatio = 'auto',
  type,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const aspectClasses = {
    poster: 'aspect-poster',
    backdrop: 'aspect-backdrop',
    square: 'aspect-square',
    auto: '',
  };

  // If no source provided, show placeholder immediately
  const shouldShowPlaceholder = !src || hasError;

  return (
    <div className={cn('relative overflow-hidden bg-surface', aspectClasses[aspectRatio], className)}>
      {shouldShowPlaceholder ? (
        <ImagePlaceholder aspectRatio={aspectRatio} type={type} title={alt} />
      ) : (
        <>
          {isLoading && (
            <div className="absolute inset-0 skeleton" />
          )}
          <motion.img
            src={src}
            alt={alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: isLoading ? 0 : 1 }}
            transition={{ duration: 0.3 }}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            className={cn(
              'w-full h-full object-cover',
              isLoading && 'invisible'
            )}
            loading="lazy"
          />
        </>
      )}
    </div>
  );
};

// Backdrop image with gradient overlay
export const BackdropImage: React.FC<{
  src: string | null;
  alt: string;
  className?: string;
  gradient?: 'left' | 'bottom' | 'both';
}> = ({ src, alt, className, gradient = 'both' }) => {
  return (
    <div className={cn('relative w-full h-full', className)}>
      <Image
        src={src}
        alt={alt}
        aspectRatio="backdrop"
        className="w-full h-full"
      />
      
      {/* Gradient overlays */}
      {(gradient === 'left' || gradient === 'both') && (
        <div className="absolute inset-0 gradient-hero" />
      )}
      {(gradient === 'bottom' || gradient === 'both') && (
        <div className="absolute inset-0 gradient-to-t" />
      )}
    </div>
  );
};

export default Image;
