## Easyn Flow Module — Plan

### 1. Database (Supabase)

New table `module_settings` to store editable config keyed by module name:

- `module_name` (text, unique) — e.g. `easyn_flow`
- `title`, `subtitle`, `description`
- `buy_url`, `learn_more_url`, `access_url`
- `banner_image_url`
- `is_enabled` (boolean)

RLS:
- Read: any authenticated user
- Insert/Update/Delete: admins only (via `has_role_safe(auth.uid(), 'admin')`)

Storage:
- New public bucket `module-banners` for banner image uploads
- Policies: public read; insert/update/delete restricted to admins

Seed row for `easyn_flow` with defaults from the spec.

### 2. Frontend — User-facing module

New file `src/modules/easyn-flow/EasynFlowModule.tsx`:

- Fetches `module_settings` row where `module_name = 'easyn_flow'`
- Returns `null` if `is_enabled = false`
- Layout: two-column grid (`grid-cols-1 md:grid-cols-2`) inside a Card
  - Left: title (h1), subtitle, description, 3 stacked/inline buttons
    - "Comprar Agora" → `variant="default"`, navigates to `buy_url`
    - "Saiba Mais" → `variant="outline"`, opens `learn_more_url` in new tab
    - "Acessar Sistema" → `variant="ghost"`, navigates to `access_url`
  - Right: banner image with `rounded-2xl shadow-lg`, placeholder with upload icon if empty
- Mobile: content stacks above image (already handled by `grid-cols-1`)
- Uses existing design tokens (no custom colors)

Register in `src/pages/Index.tsx`:
- Add lazy import + entry in `tabComponents` map (`'easyn-flow'`)
- Add nav entry in `SidebarNav.tsx`

### 3. Admin Panel — Settings UI

New file `src/pages/admin/EasynFlowAdmin.tsx`:

- Form with inputs for title, subtitle, description (textarea), 3 URLs
- Image upload field → uploads to `module-banners` bucket, stores public URL
- Switch for `is_enabled`
- Save button → updates `module_settings` row (upsert by `module_name`)
- Admin-only guard via `useAuth().isAdmin`

Register route `/admin/easyn-flow` in `App.tsx` and add link in admin nav.

### 4. Files to create / edit

Create:
- `supabase/migrations/<timestamp>_easyn_flow_module.sql`
- `src/modules/easyn-flow/EasynFlowModule.tsx`
- `src/modules/easyn-flow/hooks/useEasynFlowSettings.ts`
- `src/pages/admin/EasynFlowAdmin.tsx`

Edit:
- `src/App.tsx` — add `/admin/easyn-flow` route
- `src/pages/Index.tsx` — add module to tab map
- `src/components/layout/SidebarNav.tsx` — add nav entry
- `src/pages/Admin.tsx` (or admin nav) — add link to new config page

### 5. Open questions

1. Should the module be a **sidebar entry** users navigate to, or rendered on the **Dashboard / Index home** as a promo banner (always visible until dismissed)?
2. Should visibility be **global** (admin toggle hides for everyone) or also **per-company** scoped?
3. Should "Acessar Sistema" open in a new tab or same tab?
