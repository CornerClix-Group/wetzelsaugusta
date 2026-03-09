

## Plan: Assign Nancy as Owner + Role-Based Navigation + Layout Architecture

### 1. Assign Nancy Akers as Owner
- Insert `owner` role for user ID `223b6125-f075-456b-b077-a82e7b69c840` into `user_roles` table

### 2. Create Shared Dashboard Layout (Major Architecture Fix)
Currently each sub-page (TimeClock, Compliance, etc.) renders **without the sidebar** — only `/dashboard` has it. This is broken UX.

**Create `src/components/DashboardLayout.tsx`:**
- Extracts the sidebar + header + auth logic from `Dashboard.tsx` into a shared layout
- Uses React Router `<Outlet />` for nested page content
- Fetches the current user's role from `user_roles` table
- Filters sidebar menu items based on role

**Role-based menu visibility:**

```text
┌────────────────────────┬───────┬─────────┬──────────┐
│ Menu Item              │ Owner │ Manager │ Employee │
├────────────────────────┼───────┼─────────┼──────────┤
│ Dashboard              │  ✓   │   ✓    │    ✓     │
│ Time Clock             │  ✓   │   ✓    │    ✓     │
│ Compliance             │  ✓   │   ✓    │    ✗     │
│ HR & Onboarding        │  ✓   │   ✓    │    ✗     │
│ Trucks                 │  ✓   │   ✓    │    ✗     │
│ Employees              │  ✓   │   ✓    │    ✗     │
│ Schedule               │  ✓   │   ✓    │    ✓     │
│ Settings               │  ✓   │   ✓    │    ✓     │
└────────────────────────┴───────┴─────────┴──────────┘
```

Employees see: Dashboard, Time Clock, Schedule, Settings.

### 3. Update Routing (App.tsx)
Convert flat routes to nested layout:
```tsx
<Route path="/dashboard" element={<DashboardLayout />}>
  <Route index element={<DashboardHome />} />
  <Route path="timeclock" element={<TimeClock />} />
  <Route path="compliance" element={<Compliance />} />
  ...
</Route>
```

### 4. Refactor Dashboard.tsx → DashboardHome.tsx
Strip the sidebar/layout from `Dashboard.tsx`, keep only the dashboard cards content as a simple page component (the "index" route content).

### Files Changed
- **New:** `src/components/DashboardLayout.tsx` — shared layout with role-based sidebar
- **Modified:** `src/App.tsx` — nested routes under DashboardLayout
- **Modified:** `src/pages/Dashboard.tsx` — stripped to just dashboard cards content
- **Database:** Insert owner role for Nancy Akers

