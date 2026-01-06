"use client";

import { IconPencilPlus, IconSearch, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { addTransitionType, startTransition, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchValue } from "@/providers/search-value-provider";

export default function SearchInput() {
  const isScrollingRef = useRef(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { searchValue, setSearchValue } = useSearchValue();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const t = useTranslations("SearchInput");

  return (
    <div
      ref={containerRef}
      className="isolate mx-auto flex w-full max-w-5xl items-center gap-3 px-6"
    >
      <InputGroup
        className="h-12 flex-1 p-2 backdrop-blur-xl transition-transform duration-150 ease-in-out pointer-coarse:active:z-50 pointer-coarse:active:scale-110"
        suppressHydrationWarning
      >
        <InputGroupAddon aria-hidden="true">
          <IconSearch className="size-4" />
        </InputGroupAddon>
        <InputGroupInput
          ref={inputRef}
          value={searchValue}
          onChange={(e) => {
            setSearchValue(e.target.value);
          }}
          suppressHydrationWarning
          aria-label={t("Search Notes")}
          placeholder={t("Search notes")}
          className="text-base"
          type="search"
          inputMode="search"
          onFocus={(e) => {
            setSearchFocused(true);
            const length = e.target.value.length;
            e.target.setSelectionRange(length, length);
          }}
          onBlur={(e) => {
            setSearchFocused(false);
            startTransition(() => {
              addTransitionType("search-param-update");
              const currentSerialized = searchParams.toString();
              const params = new URLSearchParams(currentSerialized);
              if (e.target.value.trim()) {
                params.set("search", e.target.value);
              } else {
                params.delete("search");
              }

              const next = params.toString();
              if (next === currentSerialized) return;
              router.replace(next ? `${pathname}?${next}` : pathname, {
                scroll: false,
              });
            });
          }}
          onKeyDown={(e) => {
            if (!isScrollingRef.current) {
              setTimeout(() => {
                const offsetTop = window.visualViewport?.offsetTop ?? 0;
                window.scrollTo({
                  top: -offsetTop,
                  behavior: "smooth",
                });
                isScrollingRef.current = false;
              }, 100);
              isScrollingRef.current = true;
            }
            if (e.key === "Enter") {
              inputRef.current?.blur();
            }
          }}
        />
      </InputGroup>
      {searchFocused ? (
        <Button
          variant="outline"
          size="icon-xl"
          type="button"
          aria-label={t("Cancel")}
          onClick={() => {
            inputRef.current?.blur();
          }}
        >
          <IconX />
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon-xl"
          type="button"
          aria-label={t("New Note")}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "instant" });
          }}
        >
          <IconPencilPlus />
        </Button>
      )}
    </div>
  );
}
