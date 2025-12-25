# Tech Debt

This document outlines potential technical debt areas in the codebase that may require future attention or general refactoring ideas to improve code quality, maintainability, and performance.
It also includes potential UI polish ideas that could enhance the user experience.

- [ ] Use comlink as an abstraction for web workers instead of manually posting messages back and forth. This would simplify the code and make it easier to manage worker communication.
- [ ] Use tanstack db/query for managing dexie indexeddb state queries and mutations. This would provide a more structured approach to data fetching and state management.
- [ ] Refactor the semantic search hook to use tanstack query for better caching, deduplication, and background updates. This would also enable the usage of Suspense for loading states.
- [ ] Move the semantic search logic to a web worker to offload processing from the main thread, improving UI responsiveness.
- [ ] Add animations and transitions to enhance the user experience, such as page transitions, smoothly animating note additions/removals, and animating component mounts/unmounts.
- [ ] Don't display loading indicators for very fast operations to avoid flickering effects. Implement a minimum display time for loading states.
