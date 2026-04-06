## components/

### OVERVIEW
React 19 UI components with Framer Motion animations, specialized for RSS article display and settings management.

### STRUCTURE
- **ArticleCard.tsx**: Reusable article display component with responsive image support
- **ui/**: Reusable UI primitives (Card, Dialog, Button, Input, etc.)

### WHERE TO LOOK
- Image handling: Import `getMediaUrl` from `services/rssService.ts` for image rendering
- Performance optimizations: ArticleCard memoization

### CONVENTIONS
- **Media rendering**: Use `getMediaUrl(article.thumbnail)` for all images
- **Component style**: Functional components only, no class components

### ANTI-PATTERNS
- ❌ Inline styles - Use Tailwind utility classes exclusively
- ❌ Raw `<img src="...">` without getMediaUrl - Use the helper for consistent URL resolution
