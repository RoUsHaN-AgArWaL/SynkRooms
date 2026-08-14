# Frontend Documentation — Chattr

## Architecture

The frontend is a **React 18 Single Page Application (SPA)** built with:

- **Vite** as the build tool and dev server
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **React Router DOM v7** for client-side routing
- **Framer Motion** for animations
- **Native WebSocket API** for real-time communication

There are **no state management libraries** (no Redux, no Zustand, no Context API). All state is local component state via `useState` and `useRef`.

---

## Entry Points

### `index.html`

The HTML shell that Vite uses as the entry point.

**Key Details:**
- Charset: UTF-8
- Viewport: responsive (`width=device-width, initial-scale=1.0`)
- Favicon: `/messenger.png` (chat bubble icon)
- Title: "Chattr"
- Includes full SEO meta tags (title, description, keywords)
- Includes Open Graph (Facebook) and Twitter Card meta tags
- The claims in meta tags about "end-to-end encryption" are **inaccurate** — the app does not implement E2E encryption
- Single mount point: `<div id="root">`
- Module entry: `/src/main.tsx`

### `src/main.tsx`

Standard React 18 entry point.

```tsx
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- Uses `createRoot` (React 18 concurrent mode)
- Wraps in `StrictMode` (double-renders in development for detecting side effects)
- Imports `index.css` for global styles

---

## Routing

### `src/App.tsx`

Defines all application routes using React Router DOM's `BrowserRouter`.

| Route | Component | Purpose |
|-------|-----------|---------|
| `/` | `<Homepage />` | Landing page with hero section and CTA buttons |
| `/join` | `<Join />` | Form to enter a room code |
| `/chat` | `<Chat />` | Active chat room (uses `?roomid=` query param) |

**Key Notes:**
- No 404/catch-all route — navigating to an undefined path shows a blank page
- No route protection/guards — all routes are publicly accessible
- No layout wrappers — each page independently includes `<Header />` and `<Footer />`

---

## Pages

### `src/pages/Homepage.tsx`

The landing page and primary entry point for users.

**Responsibilities:**
- Displays the animated hero section with rotating words ("Secure", "Private", "Instant")
- Provides two CTA buttons: "Create a room" and "Join a room"
- Includes Header, Footer, and decorative Underline component

**Dependencies:**
- `useNavigate` from react-router-dom
- `WordRotate` component (animated word cycling)
- `Header`, `Footer`, `Underline` components

**Navigation Flow:**
- "Create a room" button → navigates to `/chat` (no roomId — one will be generated)
- "Join a room" button → navigates to `/join`

**Styling:**
- Full-height flexbox layout
- Gradient background (violet-200 to white in light mode, neutral-950 to neutral-900 in dark mode)
- Responsive text sizes (4xl → 5xl → 6xl → 7xl)
- Bricolage Grotesque font for headings
- Indigo color scheme

### `src/pages/Join.tsx`

Room code entry form.

**Responsibilities:**
- Accepts a 6-character room code from the user
- Validates that exactly 6 characters are entered before enabling submit
- Navigates to the chat room with the entered code

**State:**
- `ref` (`useRef<HTMLInputElement>`) — uncontrolled input reference
- `disabled` (`useState<boolean>`) — controls submit button enabled/disabled state

**Form Behavior:**
- `maxLength={6}` on the input field
- Submit button is disabled until input length === 6
- On submit: navigates to `/chat?roomid={code}`
- Form uses `onSubmit` with `e.preventDefault()`

**Dependencies:**
- `useNavigate` from react-router-dom
- `Header` component
- `GoArrowRight` icon from react-icons

**Notable:**
- **No Footer component** is included on this page (unlike Homepage and Chat)
- Input value is logged to console on submit (`console.log(ref.current?.value)`)
- No validation beyond length (any 6 characters accepted)
- Case-insensitive: the Chat page lowercases the roomId

### `src/pages/Chat.tsx`

The core chat room page. This is the most complex component in the application.

**Responsibilities:**
- Establishes WebSocket connection to the backend
- Manages room joining and message sending
- Displays chat messages in a scrollable container
- Shows invite code with copy-to-clipboard functionality
- Provides exit chat navigation

**State & Refs:**
| Variable | Type | Purpose |
|----------|------|---------|
| `messages` | `useState<string[]>` | Array of received messages |
| `isCopied` | `useState<boolean>` | Copy-to-clipboard feedback |
| `roomId` | `useState<string>` | Current room ID (from URL or generated) |
| `wsRef` | `useRef<WebSocket>` | WebSocket connection reference |
| `inputRef` | `useRef<HTMLInputElement>` | Message input reference |
| `messageRef` | `useRef<HTMLDivElement>` | Last message element (for auto-scroll) |
| `inviteCodeRef` | `useRef<HTMLDivElement>` | Invite code element (for clipboard) |
| `params` / `setParams` | `useSearchParams` | URL query parameters |

**WebSocket Lifecycle (in `useEffect`):**
1. Creates new WebSocket connection to `BACKEND_URL` (`wss://chattr-0rux.onrender.com`)
2. Sets `onmessage` handler to append received messages to state
3. If no `roomId` exists in URL, generates one via `generateRoomId()`
4. Updates URL search params with `roomid`
5. On WebSocket `open`: sends `join` message with `roomId`
6. Cleanup: closes WebSocket on component unmount

**Message Sending:**
1. Form submit captures `inputRef.current.value`
2. Sends JSON payload: `{ type: "chat", payload: { message } }`
3. Clears the input field

**Copy Invite Code:**
- Uses `navigator.clipboard.writeText()`
- Shows checkmark icon for 2 seconds after successful copy
- Falls back to `console.error` on failure

**UI Layout:**
- Header bar with "Exit Chat" button and invite code display
- Main chat area with scrollable message container
- Fixed-bottom message input form with send button
- Messages displayed as right-aligned blue bubbles
- "Start a conversation!" placeholder when no messages

**Critical Architecture Issues:**
1. **No sender identification** — All messages (sent and received) appear identically. There is no way to distinguish your own messages from others'. All messages appear as blue bubbles on the right.
2. **useEffect dependency issue** — The WebSocket effect depends on `[roomId, setParams]`. If `roomId` changes, it reconnects. However, `setParams` is called inside the effect, and `setParams` is also in the dependency array — this could cause re-renders but React Router's `setSearchParams` is stable so it doesn't cause loops.
3. **No reconnection logic** — If the WebSocket disconnects, there is no retry mechanism
4. **No error handling** — WebSocket errors are not caught or displayed to the user

---

## Components

### `src/components/Header.tsx`

Global navigation header.

**Renders:**
- "Chattr" logo text (Bricolage Grotesque font) with chat icon (`BsChatFill`)
- Theme toggle button (`<Theme />`)
- Logo is clickable — navigates to `/`

**Styling:**
- Fixed height: `h-16`
- Backdrop blur: `backdrop-blur-xl`
- Shadow: `shadow-lg`
- Responsive padding: `px-6` → `sm:px-12` → `lg:px-16`
- Dark/light mode colors

### `src/components/Footer.tsx`

Attribution footer.

**Renders:**
- "Made with ❤️ by tanishkadeep" with link to portfolio

**Styling:**
- Dark background (`bg-neutral-900`)
- Light text (`text-neutral-200`)
- Centered text, responsive font size

**Notes:**
- This component has **no dark mode variants** — it always uses dark styling
- Not included on the Join page

### `src/components/theme.tsx`

Dark/light mode toggle.

**State:**
- `theme` (`useState<string>`) — defaults to `"light"`

**Behavior:**
- Toggles between `"light"` and `"dark"`
- Adds/removes `"dark"` class on `document.documentElement` (required by Tailwind's `darkMode: 'class'` strategy)
- Shows sun icon (`MdSunny`) in dark mode, moon icon (`IoIosMoon`) in light mode

**Issues:**
1. **No persistence** — Theme resets to light on page refresh (no `localStorage`)
2. **No system preference detection** — Does not check `prefers-color-scheme`
3. **Initial flash** — Always starts in light mode, even if user previously set dark

### `src/components/WordFlip.tsx`

Animated word rotation using Framer Motion.

**Props:**
| Prop | Type | Default | Purpose |
|------|------|---------|---------|
| `words` | `string[]` | required | Array of words to cycle through |
| `duration` | `number` | `2500` | Milliseconds between rotations |
| `framerProps` | `MotionProps` | fade+slide | Animation configuration |
| `className` | `string` | — | Additional CSS classes |

**Behavior:**
- Cycles through words array infinitely using `setInterval`
- Uses `AnimatePresence` with `mode="wait"` for smooth exit/enter transitions
- Default animation: fade in from top, fade out to bottom (0.25s ease-out)
- Cleans up interval on unmount

**Used in:** Homepage.tsx with words `["Secure", "Private", "Instant"]`

### `src/components/Underline.tsx`

A purely decorative SVG underline element.

**Renders:**
- An inline SVG path that resembles a hand-drawn underline
- Color adapts to dark/light mode (`fill-indigo-950` / `fill-indigo-100`)

**Used in:** Homepage.tsx under the "No data saved, ever." text

---

## Utilities (`lib/`)

### `lib/config.ts`

Single constant export:

```typescript
export const BACKEND_URL = "wss://chattr-0rux.onrender.com";
```

**Issues:**
- **Hardcoded production URL** — No environment variable support
- In development, this will attempt to connect to the production server
- No HTTP URL defined (only WebSocket URL)

### `lib/utils.ts`

Two utility functions:

#### `cn(...inputs: ClassValue[]): string`

Combines `clsx` and `tailwind-merge` to conditionally merge Tailwind CSS classes without conflicts.

```typescript
import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Used in:** `WordFlip.tsx` only

#### `generateRoomId(): string`

Generates a 6-character alphanumeric room ID.

```typescript
export function generateRoomId() {
  return Math.random().toString(36).substring(2, 8);
}
```

**Security Note:** Uses `Math.random()` which is **not cryptographically secure**. Room IDs are predictable and could potentially be brute-forced (36^6 ≈ 2.18 billion possibilities, but `Math.random()` has limited entropy).

**Used in:** `Chat.tsx` when creating a new room

---

## Styling System

### Tailwind CSS Configuration

```javascript
// tailwind.config.js
export default {
  darkMode: 'class',                              // Dark mode via 'dark' class on <html>
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],  // Purge paths
  theme: { extend: {} },                           // No custom theme extensions
  plugins: [],                                     // No plugins
}
```

### PostCSS Pipeline

```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

### Custom CSS (`index.css`)

1. **Google Font Import**: Bricolage Grotesque (weights 200–800)
2. **Base Font**: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif
3. **Custom Font Classes**:
   - `.font-bricolage-grotesque` — headings font
   - `.font-courier` — monospace font for invite codes
4. **Scrollbar Hiding**: Custom utility `.no-scrollbar` + global scrollbar removal

### Color Palette (used throughout)

| Element | Light Mode | Dark Mode |
|---------|-----------|-----------|
| Background | `bg-gradient-to-t from-violet-200` | `dark:from-neutral-950 dark:to-neutral-900` |
| Text | `text-neutral-800` | `dark:text-neutral-100` |
| Headings | `text-indigo-900` | `dark:text-indigo-400` |
| Primary Button | `bg-indigo-700` | same |
| Secondary Button | `bg-indigo-500` | same |
| Chat Bubble | `bg-blue-500` | same |
| Header | `bg-neutral-100` | `dark:bg-neutral-950` |
| Exit Button | `text-red-500` | `dark:text-red-600` |

---

## State Management

There is **no global state management**. All state is component-local:

| Component | State Variables | Mechanism |
|-----------|----------------|-----------|
| Chat.tsx | messages, isCopied, roomId | `useState` |
| Join.tsx | disabled | `useState` |
| theme.tsx | theme | `useState` |
| WordFlip.tsx | index | `useState` |

**Refs used for:**
- WebSocket connection (`wsRef`)
- DOM elements for clipboard (`inviteCodeRef`)
- Uncontrolled input access (`inputRef`, `ref`)
- Scroll anchoring (`messageRef`)

---

## Responsive Design

The app uses Tailwind's responsive breakpoints:

| Breakpoint | Prefix | Min Width |
|------------|--------|-----------|
| Default | — | 0px |
| Small | `sm:` | 640px |
| Medium | `md:` | 768px |
| Large | `lg:` | 1024px |
| Extra Large | `xl:` | 1280px |

**Responsive behaviors:**
- Homepage title: `text-4xl` → `sm:text-5xl` → `lg:text-6xl` → `xl:text-7xl`
- Homepage layout: stacked → horizontal (`flex-col` → `sm:flex-row`)
- CTA buttons: `w-48` → `sm:w-96`
- Header padding: `px-6` → `sm:px-12` → `lg:px-16`
- Chat area width: `w-3/4` → `md:w-2/3`
- Join form width: `w-56` → `md:w-80`

---

## Build System

### Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})
```

Minimal configuration — uses `@vitejs/plugin-react` with Babel for Fast Refresh.

### NPM Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `vite` | Start dev server with HMR |
| `build` | `tsc -b && vite build` | Type-check then build for production |
| `lint` | `eslint .` | Run ESLint |
| `preview` | `vite preview` | Preview production build locally |

### TypeScript Configuration

- **Target**: ES2020
- **JSX**: react-jsx (automatic runtime)
- **Module**: ESNext with bundler resolution
- **Strict mode**: enabled
- **No unused locals/parameters**: enforced
- Incremental compilation enabled

### Deployment (Vercel)

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

All routes rewrite to `/` (index.html) for client-side routing support.

---

## Error Handling

**The frontend has minimal error handling:**

| Scenario | Handling |
|----------|----------|
| WebSocket connection failure | ❌ No handling — silent failure |
| WebSocket disconnect | ❌ No handling — no reconnection |
| Clipboard copy failure | ✅ `console.error` (not user-visible) |
| Empty message submission | ✅ Prevented (checks `if (message && wsRef.current)`) |
| Missing room code on join | ✅ Prevented (checks `if (!ref.current?.value) return`) |
| Invalid route navigation | ❌ No 404 page |
| Network offline | ❌ No handling |

---

## What's NOT Present

The frontend does **not** have:

- Context API / Context providers
- Custom hooks
- HOCs (Higher-Order Components)
- Error boundaries
- Loading states / skeletons
- Toast/notification system
- Modal/dialog components
- Form validation library
- API service layer (axios/fetch wrappers)
- Environment variable usage (`.env`)
- Testing (no test files, no testing libraries)
- Storybook or component documentation
- Accessibility (ARIA) attributes
- Internationalization (i18n)
- PWA / Service Worker
- Code splitting / lazy loading
