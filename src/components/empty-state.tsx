import type { PropsWithChildren } from "react";

import { Empty } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends PropsWithChildren {
  className?: string;
}

export function EmptyState({ children, className }: EmptyStateProps) {
  return (
    <Empty
      className={cn(
        "text-muted-foreground border border-dashed shadow-inner",
        className,
      )}
    >
      {children}
    </Empty>
  );
}
