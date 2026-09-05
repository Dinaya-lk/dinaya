"use client";

import { useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";
import { isOptimizableRemoteImage, cn } from "@/lib/utils";

type Props = {
  name: string;
  imageUrl?: string | null;
  iconName?: string;
  size?: "sm" | "md";
  fallback?: "icon" | "initial";
};

export function BookingServiceThumb({
  name,
  imageUrl,
  iconName = "scissors",
  size = "md",
  fallback = "icon",
}: Props) {
  const [failed, setFailed] = useState(false);
  const box = size === "sm" ? "size-11 rounded-lg" : "size-12 rounded-xl";
  const showImage = Boolean(imageUrl) && !failed;

  if (!showImage) {
    if (fallback === "initial") {
      return (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center bg-[var(--booking-accent-muted)] text-sm font-bold text-[var(--booking-accent)]",
            box,
          )}
        >
          {name.charAt(0).toUpperCase()}
        </div>
      );
    }
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center bg-[var(--booking-accent-muted)] ring-1 ring-border/40",
          box,
        )}
      >
        <Icon name={iconName} className="text-lg text-[var(--booking-accent)]" />
      </div>
    );
  }

  return (
    <Image
      src={imageUrl!}
      alt=""
      width={size === "sm" ? 44 : 48}
      height={size === "sm" ? 44 : 48}
      className={cn("shrink-0 object-cover image-depth", box)}
      unoptimized={!isOptimizableRemoteImage(imageUrl!)}
      onError={() => setFailed(true)}
    />
  );
}
