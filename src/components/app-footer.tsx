export function AppFooter() {
  return (
    <footer className="text-muted-foreground fixed bottom-0 z-50 flex w-full justify-center py-4 text-sm">
      <div
        className="bg-background/90 absolute inset-0 mask-[linear-gradient(to_top,black_40%,transparent)] opacity-50 backdrop-blur-sm"
        aria-hidden="true"
      />
      <p className="isolate">© 2024 Mnemos. All rights reserved.</p>
    </footer>
  );
}
