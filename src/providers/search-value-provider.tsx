"use client";

import { useSearchParams } from "next/navigation";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface SearchValueContextValue {
  searchValue: string;
  setSearchValue: (value: string) => void;
}

export const SearchValueContext = createContext<SearchValueContextValue>({
  searchValue: "",
  setSearchValue: () => {},
});

export function SearchValueProvider({ children }: React.PropsWithChildren) {
  const searchParams = useSearchParams();

  const paramQuery = searchParams.get("search") ?? "";

  const [searchValue, setSearchValue] = useState(() => paramQuery);

  const latestSerializedSearchParamsRef = useRef(searchParams.toString());
  const latestParamQueryRef = useRef(paramQuery);

  useEffect(() => {
    latestSerializedSearchParamsRef.current = searchParams.toString();
    latestParamQueryRef.current = paramQuery;
  }, [paramQuery, searchParams]);

  const contextValue = useMemo(
    () => ({ searchValue, setSearchValue }),
    [searchValue],
  );

  return (
    <SearchValueContext.Provider value={contextValue}>
      {children}
    </SearchValueContext.Provider>
  );
}

export function useSearchValue() {
  return use(SearchValueContext);
}
