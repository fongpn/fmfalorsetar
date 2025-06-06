import { useState } from 'react';
import { cn } from '@/lib/utils';

interface FallbackImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  fallbackSrc?: string;
  src: string | null;
}

export function FallbackImage({ 
  src, 
  fallbackSrc = '/images/placeholder.svg',
  alt,
  className,
  ...props 
}: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);

  const handleError = () => {
    setImgSrc(fallbackSrc);
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      onError={handleError}
      className={cn('object-cover', className)}
      {...props}
    />
  );
} 