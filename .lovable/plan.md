

## Diagnosis

After analyzing the code and database, I found **three root causes** why the audit system is not working:

### Problem 1: face-api.js is NOT installed
The package `face-api.js` is missing from `package.json`. The dynamic `import('face-api.js')` in `useFaceDetection.ts` fails silently (caught by try/catch), so `modelsLoaded` stays `false` forever. Result: **face detection never runs**, no face flags are ever generated.

### Problem 2: IP detection logic is too lenient
The current logic checks: "is the current IP present in the last 10 IPs?" Since dynamic ISPs rotate IPs frequently (one user has 34 distinct IPs), any IP used even once in the last 10 records passes. The check should use **frequency analysis** — flag if the IP has never been seen OR is rare compared to the user's typical pattern.

### Problem 3: Location variation is ignored
The system only checks geofence (distance from company HQ), but the company coordinates are not configured. There is **no check for location variation between the user's own records** — e.g., if a user clocks in from a completely different city, that should be flagged regardless of geofence config.

### Evidence from database
- **ALL** 251+ records have `trust_score=100`, `audit_status='normal'`, `audit_flags=[]`
- Users have up to 34 distinct IPs and 7 distinct locations — none flagged
- No face validation has ever run

---

## Fix Plan

### 1. Install face-api.js dependency
Add `face-api.js` to `package.json` so the dynamic import succeeds.

### 2. Fix useFaceDetection.ts — robust loading + retry
- Add retry logic if initial load fails (reset `loadingPromise` on failure so it can retry)
- Add explicit console warnings when face-api fails to load so the issue is visible
- In `validatePhoto`, if models aren't loaded after initialize attempt, add a `foto_nao_validada` flag (score -10) so unvalidated photos don't get 100

### 3. Fix useAuditEngine.ts — smarter IP + location checks

**IP analysis (improved):**
- Fetch last 20 IPs instead of 10
- Count frequency: if the current IP appears in 0 of last 20 records → flag as `ip_novo` (-15)
- If fewer than 2 of the last 20 → flag as `ip_suspeito` (-30)
- This handles dynamic IPs better while still catching truly unusual IPs

**Location variation analysis (new):**
- Fetch the user's last 5 records with GPS coordinates
- Calculate distance from each; if average distance to previous records > 5km → flag as `localizacao_diferente` (-30)
- This works WITHOUT needing geofence configuration

### 4. Fix ClockButton.tsx — better error visibility
- Log face detection result to console
- Show a subtle indicator to the user when face detection is unavailable (yellow camera icon instead of green)

### 5. Add re-audit capability for historical records
- In `AuditDashboard.tsx`, add a "Re-auditar registros" button
- Runs IP + location analysis on existing records (can't re-run face detection on historical photos, but can flag IP/location anomalies)
- Updates `trust_score`, `audit_flags`, `audit_status` in bulk

### Files to modify
1. **`package.json`** — add `face-api.js: "^0.22.2"`
2. **`useFaceDetection.ts`** — retry logic, fallback flag when detection unavailable
3. **`useAuditEngine.ts`** — frequency-based IP check, location variation check, re-audit function
4. **`ClockButton.tsx`** — face detection status indicator, logging
5. **`AuditDashboard.tsx`** — re-audit button for historical records

### Scoring matrix (updated)

```text
Situation                        Delta   Example final
Face: no face detected           -80     20 (irregular)
Face: multiple faces             -40     60 (suspicious)
Face: blurry photo               -20     80 (normal)
Face: detection unavailable      -10     90 (normal)
IP: never seen before            -15     85 (normal)
IP: rare (< 2 of last 20)       -30     70 (suspicious)
Location: > 5km from usual       -30     70 (suspicious)
Geofence: outside radius         -50     50 (suspicious)
Multiple violations              cumul.  varies
```

