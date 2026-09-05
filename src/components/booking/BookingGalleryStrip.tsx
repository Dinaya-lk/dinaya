"use client";

import { useState } from "react";
import Image from "next/image";
import { isOptimizableRemoteImage } from "@/lib/utils";

type Props = {
  urls: string[];
  businessName: string;
};

export function BookingSafeImage({
  url,
  alt = "",
  className = "object-cover",
  sizes,
}: {
  url: string;
  alt?: string;
  className?: string;
  sizes: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={url}
      alt={alt}
      fill
      sizes={sizes}
      className={className}
      unoptimized={!isOptimizableRemoteImage(url)}
      onError={() => setFailed(true)}
    />
  );
}

function GalleryTile({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <li className="relative aspect-[4/3] min-w-[9.5rem] overflow-hidden rounded-xl bg-muted sm:min-w-0">
      <Image
        src={url}
        alt={alt}
        fill
        sizes="(max-width: 768px) 40vw, 180px"
        className="object-cover outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
        unoptimized={!isOptimizableRemoteImage(url)}
        onError={() => setFailed(true)}
      />
    </li>
  );
}

export function BookingGalleryStrip({ urls, businessName }: Props) {
  const photos = urls.filter(Boolean).slice(0, 12);
  if (photos.length === 0) return null;

  return (
    <div className="px-4 pb-3 md:px-6">
      <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-3 sm:overflow-visible md:grid-cols-4">
        {photos.map((url, index) => (
          <GalleryTile
            key={`${url}-${index}`}
            url={url}
            alt={`${businessName} photo ${index + 1}`}
          />
        ))}
      </ul>
    </div>
  );
}
