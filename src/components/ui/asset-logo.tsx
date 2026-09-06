"use client";

import { useState } from "react";
import {
  assetInitial,
  assetLogoSrc,
  assetTint,
  type AssetVisualClass,
} from "@/lib/asset-visuals";
import { cn } from "@/lib/utils";

export function AssetLogo({
  ticker,
  assetClass,
  size = 36,
  className,
}: {
  ticker: string;
  assetClass?: AssetVisualClass;
  size?: number;
  className?: string;
}) {
  const src = assetLogoSrc(ticker, assetClass);
  const [failed, setFailed] = useState(false);
  const tint = assetTint(ticker, assetClass);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        className,
      )}
      style={{ width: size, height: size, background: tint }}
      aria-hidden
    >
      <span
        className="text-[11px] font-bold leading-none text-white"
        style={{ fontSize: size < 28 ? 9 : 11 }}
      >
        {assetInitial(ticker)}
      </span>
      {src && !failed ? (
        // External coin art; initials stay underneath if the CDN fails.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={size}
          height={size}
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </span>
  );
}
