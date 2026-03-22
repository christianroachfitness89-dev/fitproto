# FitProto — Coach Client Platform

A full-stack fitness coaching platform with web and mobile apps, styled after Everfit.

## Project Structure

```
fitproto/
├── packages/
│   ├── web/        # React + Vite + Tailwind (Web App)
│   └── mobile/     # Expo React Native (iOS + Android + Web)
```

## Web App (`packages/web`)

**Stack:** React 18 · TypeScript · Vite · Tailwind CSS · React Router

### Features
- **Dashboard** — Client overview, stats, tasks, messages
- **Clients** — Table/grid view, filters, status badges, search
- **Client Detail** — Profile, metrics, assigned programs, tasks
- **Library** — Exercises, Workouts, Programs, Forms, Meal Plans
- **Inbox** — Real-time-style coach/client messaging
- **Sidebar navigation** — Collapsible library submenu, mobile responsive

### Run
```bash
cd packages/web
npm install
npm run dev
```

## Mobile App (`packages/mobile`)

**Stack:** Expo · React Native · Expo Router · NativeWind

### Features
- Bottom tab navigation (Dashboard, Clients, Library, Inbox, Profile)
- Dark theme matching web app
- Native-feel client cards with compliance stats
- Messaging / inbox screen

### Run
```bash
cd packages/mobile
npm install
npx expo start
```

## Design Language

- **Primary color:** Indigo/Brand `#6366f1`
- **Dark sidebar:** `#1c1c2e`
- **Background:** `#13131f` (mobile) / `#f9fafb` (web)
- **Font:** Inter
- Inspired by Everfit's clean coach dashboard UI
