"use client";

interface CustomAvatarProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export function CustomAvatar({ src, alt, className = "", fallbackSrc = "/noAvatar.png" }: CustomAvatarProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        (e.target as HTMLImageElement).src = fallbackSrc;
      }}
    />
  );
}
