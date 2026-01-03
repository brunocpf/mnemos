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
      <div className="relative h-600 bg-blue-300 pb-32">
        <p>Subpath</p>
        <Link href="/subpath/subpath2">Go to subpath 2</Link>
      </div>
    </ViewTransition>
  );
}
