"use client";
import { useState } from "react";

type Props = {
  src: string | undefined;
  alt: string;
  className?: string;
  priority?: boolean;
  style?: React.CSSProperties;
  imgRef?: React.Ref<HTMLImageElement>;
};

/** Plain img with a tinted placeholder and a fade once loaded (no layout shift: parent owns the aspect ratio). */
export function ProductImage({ src, alt, className = "", priority, style, imgRef }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="absolute inset-0 bg-paper">
      {src && !failed && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          style={style}
          className={`h-full w-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
          draggable={false}
        />
      )}
    </div>
  );
}
