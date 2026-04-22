# Kira2Lah — Frontend

Next.js 14 (App Router) + Tailwind CSS. Pages:

| Path                 | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `/`                  | Landing page — hero, "how it works", Login / Try now CTAs.          |
| `/login`             | Phone + password **or** phone + OTP (tabbed).                       |
| `/signup`            | Create account (phone number primary, email optional).              |
| `/forgot-password`   | Password reset via OTP.                                             |
| `/shops/new`         | "Let's add your first shop" screen post-signup, or additional shop. |
| `/upload`            | 3-tab data intake — File · Scan · Chat. Works for guests.           |
| `/dashboard`         | Past reports list + embedded Streamlit charts. Requires a shop.     |
| `/report/[id]`       | Full AI report + strategy chat + export/share (authed) or signup prompt (guest). |

## Design tokens

Colors are defined as CSS variables in `src/styles/globals.css` and exposed through Tailwind as semantic names (`bg-bg`, `bg-surface`, `text-primary`, etc.). Flipping `html.dark` swaps the palette — `tailwind.config.ts` uses `darkMode: 'class'`.

Headlines use **Playfair Display** (serif), body is **Inter** — loaded from Google Fonts in `globals.css`.

## State providers

Wrapped in `src/app/layout.tsx` via `<Providers>`:

- `I18nProvider` — language (`en`/`ms`/`zh`), persists to `localStorage.kira2lah.language` and optionally mirrors to the authenticated user's profile.
- `ThemeProvider` — light/dark/system, persists to `localStorage.kira2lah.theme`. An inline `<script>` runs before first paint to avoid flash-of-wrong-theme.

## Auth

Session cookies are httpOnly, so the frontend never touches a token directly. Every call in `src/lib/api.ts` uses `credentials: 'include'` and attaches an `X-Shop-Id` header (from `localStorage`) so the backend can scope per active shop.
