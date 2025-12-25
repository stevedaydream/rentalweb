<!-- Copilot / AI agent guidance for contributors and automated agents -->
# Copilot Instructions — rental-system

Purpose: give AI coding agents immediate, actionable knowledge to work productively in this repo.

- Quick start (development)
  - Install deps: `npm install`
  - Run dev server: `npm run dev` (Vite). On Windows `cmd.exe`: `npm run dev`.
  - Type-check & build: `npm run build` (runs `vue-tsc -b && vite build`).

- High-level architecture
  - Frontend-only SPA built with **Vue 3 + TypeScript + Vite** (see `package.json`).
  - Global state: **Pinia**. Stores live in `src/stores/` (e.g. `auth.ts`).
  - Routing: **vue-router** with nested layouts and route `meta` fields (`requiresAuth`, `role`) in `src/router/index.ts`.
  - Backend/integration: **Firebase** for Auth and Firestore. Firebase app is configured in `src/firebase/config.ts`.
  - Styling: **Tailwind CSS** (see `tailwind.config.js` and `src/style.css`).

- Project-specific patterns and conventions
  - SFCs use `<script setup lang="ts">` consistently (see `src/views/*`).
  - Pinia stores follow the composition-style `defineStore(..., () => { const foo = ref(); return { foo } })` pattern (see `src/stores/auth.ts`).
  - Router guards call `authStore.init()` and check `authStore.loading` before navigating. Use `to.meta.requiresAuth` and `to.meta.role` for access control (see `src/router/index.ts`).
  - `localStorage` key `selectedRole` is used by auth flows to persist chosen user role.
  - Placeholder pages: many routes point to an inline `PlaceholderPage` while real pages are built — expect and preserve these scaffolds.

- Integration details agents must know
  - Firebase usage:
    - `src/firebase/config.ts` contains the firebase config and exports `auth` and `db` used across the app.
    - `src/stores/auth.ts` listens with `onAuthStateChanged`, and reads/writes the `users` collection in Firestore (`doc(db,'users', uid)`).
  - When modifying auth or user profile flows, update both `auth.ts` and any router guards referring to `userProfile.role`.

- Common change patterns (how to implement typical edits)
  - Add a new route: add to `src/router/index.ts` under the proper layout; use `meta.requiresAuth` if protected and add a `name` for navigation.
  - Add a new store: create `src/stores/<name>.ts` using the same composition-style `defineStore` pattern and export a `use...Store` hook.
  - Replace mock data in views (e.g. `src/views/auth/landlord/Dashboard.vue`): fetch from Firestore via imported `db` and store in Pinia or local component state.

- Noteworthy commands / checks
  - `npm run dev` — local development (Vite hot reload)
  - `npm run build` — runs TypeScript checks (`vue-tsc -b`) before building; keep this in mind when changing types.
  - There are no tests or CI configs present — treat type checking and local dev as the main verification steps.

- Security / secrets
  - `src/firebase/config.ts` currently contains a concrete config object — treat it as development-only. For production, expect to replace with environment variables.

- Helpful file map (start here)
  - `src/main.ts` — app bootstrap and Pinia/router registration.
  - `src/router/index.ts` — routes, nested layouts, route meta and global guard logic.
  - `src/stores/auth.ts` — auth lifecycle, login/register, Google sign-in, onboarding redirect logic.
  - `src/firebase/config.ts` — Firebase app + exports `auth`, `db`.
  - `src/views/` — pages and mock data (many components use placeholder/mock data to be replaced by Firestore queries).

If anything in this guide is unclear or you want examples added (e.g. a step-by-step for adding a Firestore query), tell me which area to expand and I will iterate.
