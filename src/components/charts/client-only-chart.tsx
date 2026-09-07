"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Recharts measures the container on the client; skip SVG until mount. */
export function ClientOnlyChart({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return <div className={className} />;
  return <>{children}</>;
}
