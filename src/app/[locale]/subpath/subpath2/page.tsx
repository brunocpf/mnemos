import { ViewTransition } from "react";

import { Link } from "@/i18n/navigation";

export default function SubpathPage() {
  return (
    <ViewTransition
      enter={{
        "navigation-back": "slide-in-back",
        "navigation-forward": "slide-in-forward",
        default: "slide-in-forward",
      }}
      exit={{
        "navigation-back": "slide-in-back",
        "navigation-forward": "slide-in-forward",
        default: "slide-in-forward",
      }}
    >
      <div className="relative h-800 bg-red-300 pb-32">
        <p>Subpath 2</p>

        <Link href="/subpath">Go to subpath</Link>
      </div>
    </ViewTransition>
  );
}
