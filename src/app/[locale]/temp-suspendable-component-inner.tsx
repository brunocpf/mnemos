"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { db } from "@/client-data/db";
import { dexieLoading } from "@/lib/dexie-loading";

export default function TempSuspendableComponentInner() {
  const data = useLiveQuery(() => db.notes.toArray(), [], dexieLoading);

  if (data === dexieLoading) {
    return <p>Loading...</p>;
  }

  return <div>{JSON.stringify(data[0])}</div>;
}
