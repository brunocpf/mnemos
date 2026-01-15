"use client";

import * as Comlink from "comlink";
import { DependencyList, useEffect, useMemo, useState } from "react";

export type ComlinkWorker<T> = {
  worker?: Worker;
  proxy?: Comlink.Remote<T>;
};

export function useComlinkWorker<T>(
  createWorker: () => Worker,
  deps: DependencyList = [],
): ComlinkWorker<T> {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const instance = useMemo<ComlinkWorker<T>>(() => {
    if (typeof window === "undefined" || typeof Worker === "undefined") {
      return {};
    }

    const worker = createWorker();
    const proxy = Comlink.wrap<T>(worker);

    return {
      worker,
      proxy,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted, ...deps]);

  useEffect(() => {
    const innerProxy = instance.proxy;
    const innerWorker = instance.worker;
    return () => {
      innerProxy?.[Comlink.releaseProxy]?.();
      innerWorker?.terminate();
    };
  }, [instance]);

  return instance;
}

export function useComlinkWorker2<T>(
  createWorker: () => Worker,
  deps: DependencyList = [],
) {
  const [workerApi, setWorkerApi] = useState<Comlink.Remote<T> | null>(null);

  useEffect(() => {
    let worker: Worker | null = null;
    let api: Comlink.Remote<T> | null = null;
    function init() {
      worker = createWorker();
      api = Comlink.wrap<T>(worker);
      setWorkerApi(api);
    }

    init();

    return () => {
      setWorkerApi(null);
      api?.[Comlink.releaseProxy]?.();
      worker?.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return workerApi;
}
