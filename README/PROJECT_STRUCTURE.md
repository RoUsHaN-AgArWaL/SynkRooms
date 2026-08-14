# Project Structure — Chattr

## Root Directory

```
chattr/
├── .git/                    # Git repository
├── README.md                # Root project README (user-facing)
├── README/                  # 📁 Generated documentation (this directory)
├── client/                  # 📁 React frontend application
└── server/                  # 📁 Node.js WebSocket backend
```

## Client (Frontend) Structure

```
client/
├── .gitignore               # Git ignore rules (node_modules, dist, logs, editors)
├── README.md                # Vite boilerplate README (not project-specific)
├── eslint.config.js          # ESLint config — TS + React Hooks + React Refresh
├── index.html               # HTML entry point with SEO meta tags
├── package.json             # Dependencies & scripts
├── package-lock.json        # Dependency lock file
├── postcss.config.js         # PostCSS config — Tailwind + Autoprefixer
├── tailwind.config.js        # Tailwind CSS config — dark mode via 'class' strategy
├── tsconfig.json            # Root TS config — references app + node configs
├── tsconfig.app.json        # TS config for app source (ES2020, React JSX, strict)
├── tsconfig.node.json       # TS config for Vite config file (ES2022, strict)
├── vercel.json              # Vercel deployment config — SPA rewrites
├── vite.config.ts           # Vite config — React plugin only
│
├── lib/                     # 📁 Shared utilities (outside src/)
│   ├── config.ts            # Backend WebSocket URL constant
│   └── utils.ts             # cn() helper + generateRoomId()
│
├── public/                  # 📁 Static assets (served as-is)
│   ├── messenger.png        # App favicon (chat bubble icon)
│   └── vite.svg             # Default Vite logo (unused)
│
├── src/                     # 📁 Main application source
│   ├── main.tsx             # React entry point — renders <App /> into #root
│   ├── App.tsx              # Root component — BrowserRouter + Routes
│   ├── App.css              # Empty file (unused)
│   ├── index.css            # Global styles — fonts, Tailwind directives, scrollbar hiding
│   ├── vite-env.d.ts        # Vite client type reference
│   │
│   ├── assets/              # 📁 Imported assets
│   │   └── react.svg        # React logo SVG (unused)
│   │
│   ├── components/          # 📁 Reusable UI components
│   │   ├── Header.tsx       # App header — logo + theme toggle
│   │   ├── Footer.tsx       # App footer — attribution link
│   │   ├── Underline.tsx    # Decorative SVG underline for hero text
│   │   ├── WordFlip.tsx     # Animated rotating word component (Framer Motion)
│   │   └── theme.tsx        # Dark/light theme toggle button
│   │
│   └── pages/               # 📁 Route-level page components
│       ├── Homepage.tsx     # Landing page — hero + CTA buttons
│       ├── Join.tsx         # Room join page — room code input form
│       └── Chat.tsx         # Chat room page — WebSocket connection + messaging UI
│
└── node_modules/            # 📁 Installed dependencies (git-ignored)
```

## Server (Backend) Structure

```
server/
├── .gitignore               # Git ignore rules (node_modules, dist)
├── package.json             # Dependencies & scripts
├── package-lock.json        # Dependency lock file
├── tsconfig.json            # Full TypeScript config (CommonJS, ES2016, strict)
├── tsconfig.tsbuildinfo     # TS incremental build info
│
├── src/                     # 📁 Source code
│   └── index.ts             # Entire backend — Express + WebSocket server
│
├── dist/                    # 📁 Compiled JavaScript output
│   └── index.js             # Compiled version of src/index.ts
│
└── node_modules/            # 📁 Installed dependencies (git-ignored)
```

## File Count Summary

| Directory | Source Files | Config Files | Total |
|-----------|-------------|--------------|-------|
| `client/src/` | 9 | 0 | 9 |
| `client/lib/` | 2 | 0 | 2 |
| `client/` (root configs) | 0 | 10 | 10 |
| `server/src/` | 1 | 0 | 1 |
| `server/` (root configs) | 0 | 4 | 4 |
| **Total** | **12** | **14** | **26** |

## Key Observations

1. **Extremely Minimal Backend** — The entire server is a single 79-line file (`server/src/index.ts`)
2. **`lib/` outside `src/`** — The `lib/` directory is at `client/lib/`, not inside `client/src/`. This is unusual for Vite projects, but works because `tsconfig.app.json` only includes `src/` (the imports use relative paths like `../../lib/config`)
3. **Unused Files** — `App.css` is empty, `react.svg` and `vite.svg` are Vite scaffolding leftovers
4. **No `.env` Files** — The backend URL is hardcoded in `lib/config.ts`, not pulled from environment variables on the client side
5. **Server `dist/` committed** — The compiled `dist/index.js` appears to be committed to git (the `.gitignore` excludes `dist` but this may have been added later)
