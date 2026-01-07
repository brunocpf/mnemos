"use client";

import { IconPencilPlus, IconSearch, IconX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { addTransitionType, startTransition, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
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

  const commitSearchToUrl = (rawValue: string) => {
    startTransition(() => {
      addTransitionType("search-param-update");
      const currentSerialized = searchParams.toString();
      const params = new URLSearchParams(currentSerialized);

      const value = rawValue.trim();
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }

      const next = params.toString();
      if (next === currentSerialized) return;
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  };

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
          className="mn-no-native-search-cancel text-base"
          type="search"
          inputMode="search"
          onFocus={(e) => {
            setSearchFocused(true);
            const length = e.target.value.length;
            e.target.setSelectionRange(length, length);
          }}
          onBlur={(e) => {
            setSearchFocused(false);
            commitSearchToUrl(e.target.value);
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

        <InputGroupAddon
          align="inline-end"
          aria-hidden={searchValue.length === 0}
          className={
            searchValue.length === 0
              ? "pointer-events-none opacity-0"
              : undefined
          }
        >
          <InputGroupButton
            aria-label={t("Clear")}
            size="icon-sm"
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onClick={() => {
              setSearchValue("");
              commitSearchToUrl("");
              inputRef.current?.focus();
            }}
          >
            <IconX />
          </InputGroupButton>
        </InputGroupAddon>
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
