"use client";

import * as Comlink from "comlink";
import { DependencyList, useEffect, useState } from "react";

export type ComlinkWorker<T> = {
  worker?: Worker;
  proxy?: Comlink.Remote<T>;
};

export function useComlinkWorker<T>(
  createWorker: () => Worker,
  deps: DependencyList = [],
): ComlinkWorker<T> {
  const [instance, setInstance] = useState<ComlinkWorker<T>>({});

  // The worker is created inside the effect (not memoized during render) so
  // that Strict Mode's mount/unmount/mount cycle never reuses a released proxy.
  useEffect(() => {
    if (typeof Worker === "undefined") return;

    const worker = createWorker();
    const proxy = Comlink.wrap<T>(worker);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInstance({ worker, proxy });

    return () => {
      setInstance({});
      proxy[Comlink.releaseProxy]();
      worker.terminate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

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
