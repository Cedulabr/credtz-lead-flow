
## Analysis

The system already records: photo URL, GPS (lat/lng, city/state), IP address, user agent, device info, and clock time — all in the `time_clock` table. There is NO existing audit/trust scoring system.

The `time_clock_settings` table exists with company-level configuration, but has no geofence fields (latitude, longitude, allowed radius).

The current tabs for managers are: Ponto, Histórico, Justificativas, Banco Horas, Painel, Descontos, Salários, Folgas, Jornadas (9 tabs, grid-cols-9).

## What we'll build

### Database (Migration)
1. Add geofence columns to `time_clock_settings`:
   - `company_latitude DOUBLE PRECISION`
   - `company_longitude DOUBLE PRECISION`
   - `geofence_radius_meters INTEGER DEFAULT 500`
   - `block_on_invalid_photo BOOLEAN DEFAULT false`
   - `block_on_geofence_violation BOOLEAN DEFAULT false`

2. Add audit columns to `time_clock`:
   - `trust_score INTEGER DEFAULT 100` (0–100)
   - `audit_flags JSONB DEFAULT '[]'` (array of flag objects)
   - `audit_status TEXT DEFAULT 'normal'` (`normal`, `suspicious`, `irregular`)

3. New table `time_clock_geofence_config` — OR simply reuse `time_clock_settings` (preferred, simpler)

### Audit Logic (client-side, runs at registration + on historical records)
Function `calculateTrustScore(record)`:
- Start at 100
- If `latitude/longitude` provided AND company has geofence → calculate distance; if outside radius → -50 (flag: `fora_da_area`)
- IP analysis: compare with last 5 records for that user; if different → -30 (flag: `ip_suspeito`)
- Photo: face detection via `face-api.js` loaded client-side at capture time:
  - No face detected → -80 (flag: `foto_invalida`)
  - Multiple faces → -40 (flag: `multiplos_rostos`)
  - Low quality (canvas blur detection) → -20 (flag: `foto_borrada`)
- Determine `audit_status`: score ≥ 80 → `normal`, 40–79 → `suspicious`, < 40 → `irregular`

Face detection will be done client-side using `face-api.js` (no install needed, load from CDN or small models from public folder). This runs BEFORE the photo is uploaded/registered.

### UI Changes

**A) Score badge on every clock record** (ClockButton + AdminControl):
- 🟢 ≥ 80 = Verde "Confiável"
- 🟡 40–79 = Amarelo "Suspeito"  
- 🔴 < 40 = Vermelho "Irregular"

**B) New tab: "Auditoria"** (only for canManage) → `AuditDashboard.tsx`
- Summary cards: Total batidas | Irregulares | Suspeitas | Fora da área
- Filters: status, colaborador, período, tipo de alerta
- Table columns: Colaborador | Data/Hora | Tipo | Score | Flags | Foto | Local | IP | Ações
- Color-coded rows by audit_status

**C) Settings tab** → add geofence config section:
- Latitude da empresa, Longitude da empresa, Raio permitido (metros)
- Toggle: Bloquear registro se foto inválida / Bloquear se fora do geofence

**D) Behavior chart** (inside AuditDashboard, secondary tab):
- Line/bar chart with recharts (already installed) showing per-collaborator score trends over time

### File Plan

1. **Migration SQL** — add columns to `time_clock` and `time_clock_settings`
2. **`src/components/TimeClock/AuditDashboard.tsx`** — new full audit panel
3. **`src/components/TimeClock/useFaceDetection.ts`** — hook using face-api.js for real-time face validation
4. **`src/components/TimeClock/useAuditEngine.ts`** — scoring engine: geofence calc, IP comparison, photo result assembly
5. **`src/components/TimeClock/ClockButton.tsx`** — integrate face detection before upload, store score + flags
6. **`src/components/TimeClock/Settings.tsx`** — add geofence config fields
7. **`src/components/TimeClock/index.tsx`** — add "Auditoria" tab (10th tab for managers, grid-cols-10 on lg)
8. **`src/components/TimeClock/types.ts`** — add `trust_score`, `audit_flags`, `audit_status` to TimeClock type

### Scoring Matrix
```
Situation                 Score delta   Final status
All checks pass           0             normal (100)
IP different from usual   -30           suspicious (70)
Outside geofence          -50           suspicious/irregular (50)
Photo invalid (no face)   -80           irregular (20)
Multiple faces            -40           irregular (60)
Multiple violations       cumulative    irregular (0-39)
```

### Face Detection Approach
Use `face-api.js` loaded dynamically (no package install needed — use CDN via dynamic import or a lightweight wrapper). Models (tiny_face_detector) loaded from a public URL. This gives us:
- Face count
- Face confidence score
- Landmark detection (partial face)

Validation happens in `CameraCapture.tsx` → before allowing photo submission → show warning to user if face not detected (configurable: warn only OR block).

### Tabs layout for managers after change
Current: 9 tabs (grid-cols-9)
New: 10 tabs → `grid-cols-5 lg:grid-cols-10`
New tab: "Auditoria" with ShieldAlert icon

### Notes
- `face-api.js` will be added as a dependency
- Geofence distance calculated with Haversine formula client-side
- Historical records without score will show "N/A" (null trust_score)
- IP comparison uses last 10 records for that user_id fetched at registration time
