import { ShareHandler } from "@/components/share-handler";

// Deliberately does not read `searchParams` on the server: the page stays a
// static shell that the service worker can precache and serve offline, and
// the shared payload is read on the client.
export default function SharePage() {
  return <ShareHandler />;
}
