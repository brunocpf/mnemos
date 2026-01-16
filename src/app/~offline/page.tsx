/* eslint-disable check-file/folder-naming-convention */
export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-3 p-6">
      <h1 className="text-2xl font-semibold">You’re offline</h1>
      <p className="text-muted-foreground text-sm">
        This page is shown when the app can’t reach the network.
      </p>
      <p className="text-muted-foreground text-sm">
        Try again once you’re back online.
      </p>
    </main>
  );
}
