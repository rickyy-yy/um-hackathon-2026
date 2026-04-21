# Kira2 Je — Frontend

Next.js 14 (App Router) + Tailwind CSS. Pages map 1-to-1 to the PRD:

| Path             | Purpose                                                   |
| ---------------- | --------------------------------------------------------- |
| `/`              | Landing page — marketing, hero, "how it works" strip.     |
| `/signup`        | Register (email + password + business info).              |
| `/login`         | Log in, route based on `has_reports`.                     |
| `/upload`        | 3-tab data intake — File · Scan · Chat dengan Kira.       |
| `/dashboard`     | Past reports list + embedded Streamlit charts.            |
| `/report/[id]`   | Full AI-generated report + export/share + strategy chat.  |

## Design tokens

All colors match the PRD-mandated palette, configured in `tailwind.config.ts`
and CSS variables in `src/styles/globals.css`:

- `primary` `#0F6E56`
- `accent` `#F0DD62`
- `surface` `#C6DABF`
- `bg` `#F3E9D2`
- `alert` `#D64933`

Headlines use **Playfair Display** (serif), body is **Inter** — loaded from
Google Fonts in `globals.css`.

## Auth

The session cookie is httpOnly, so the frontend never touches the token
directly. Every fetch in `src/lib/api.ts` uses `credentials: 'include'`.
`/api/auth/me` is called from `AppShell` to gate authenticated pages;
unauthenticated visitors are redirected to `/login`.
