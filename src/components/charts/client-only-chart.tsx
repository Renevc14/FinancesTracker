"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

/** Recharts measures the container on the client; skip SVG until mount. */
export function ClientOnlyChart({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return <div className={className} />;
  return <>{children}</>;
}
