"use client";

import { IconArrowLeft } from "@tabler/icons-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "text-muted-foreground hover:text-foreground cursor-pointer",
        className,
      )}
      onClick={() => router.back()}
      aria-label="Back"
    >
      <IconArrowLeft />
      <span className="sr-only">Back</span>
    </Button>
  );
}
