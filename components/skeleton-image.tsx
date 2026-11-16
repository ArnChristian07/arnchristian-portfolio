"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { isOptimizable } from "@/lib/images";

/**
 * A `fill` image that shows a shimmering skeleton until the file has loaded,
 * then fades in. The parent must be positioned (relative/absolute).
 */
export function SkeletonImage({
  className = "",
  src,
  alt,
  onLoad,
  ...props
}: Omit<ImageProps, "fill" | "src"> & { src: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <>
      {!loaded && (
        <div aria-hidden className="skeleton absolute inset-0" style={failed ? { animation: "none" } : undefined} />
      )}
      {!failed && (
        <Image
          {...props}
          src={src}
          alt={alt}
          fill
          unoptimized={!isOptimizable(src)}
          onLoad={(e) => {
            setLoaded(true);
            onLoad?.(e);
          }}
          onError={() => setFailed(true)}
          className={`${className} transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        />
      )}
    </>
  );
}
