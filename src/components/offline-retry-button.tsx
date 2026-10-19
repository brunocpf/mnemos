"use client";

import { Button } from "@/components/ui/button";

export function OfflineRetryButton({ label }: { label: string }) {
  return (
    <Button variant="outline" onClick={() => window.location.reload()}>
      {label}
    </Button>
  );
}
