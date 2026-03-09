
## Diagnosis

After analyzing the database and code, I identified **three issues** with the audit system:

### Problem 1: Face Detection Not Running
Recent clock-ins (March 6) have photos but `audit_flags: []` — no `foto_invalida`, `foto_nao_validada`, or any face-related flags. The `face-api.js` is installed, but detection seems to fail silently. The logs show no `[FaceDetection]` output.

**Root cause**: The face detection runs AFTER photo capture in `handlePhotoCapture`, but if the canvas operations or async flow fail, the fallback creates an empty `faceResult` or the flags don't propagate to the final update.

**Evidence**: Database shows records with `trust_score: 100` and empty `audit_flags` even for photos that clearly shouldn't have faces validated (the audit should at minimum show `foto_nao_validada` if detection is unavailable).

### Problem 2: Location Variation Working But Too Conservative
The location analysis requires **at least 3 previous records** with GPS coordinates before it starts flagging. New users or users with few records won't trigger location flags.

Also, the current threshold of **5km** may be too large for some use cases (same-city detection).

### Problem 3: Historical Records Not Processed
All records from before the audit system was implemented (January/February) have `trust_score: 100` and `audit_flags: []`. The bulk re-audit exists but hasn't been run.

---

## Fix Plan

### 1. Fix Face Detection Flow (Critical)
**File: `ClockButton.tsx`**
- Add explicit logging at each step of face detection
- Ensure `faceResult` is ALWAYS set (even if empty with flags)
- Move face validation BEFORE showing confirmation dialog to give real-time feedback
- Add visible indicator when face is NOT detected (warn user before they confirm)

**File: `CameraCapture.tsx`**
- Integrate face detection directly into capture flow
- Show real-time face detection status (green border when face detected, red when not)
- Add "face detected" indicator before user confirms photo

**File: `useFaceDetection.ts`**
- Add more aggressive retry logic
- Ensure `foto_nao_validada` flag is ALWAYS returned if models fail to load
- Add timeout handling for slow model loading

### 2. Improve Location Analysis
**File: `useAuditEngine.ts`**
- Reduce minimum records requirement from 3 to 1 (compare with ANY previous record)
- Add city change detection: if `city` field differs from last record, flag as `cidade_diferente`
- Add configurable distance threshold in settings (default 2km instead of 5km)

### 3. Add Real-Time Face Feedback in Camera
**File: `CameraCapture.tsx`**
- Run face detection on live video feed (every ~2 seconds)
- Show visual indicator when face is detected (green overlay)
- Show warning when no face detected
- Optionally block capture if no face detected

### 4. Historical Data Processing
**File: `AuditDashboard.tsx`**
- Add prominent "Process Historical Records" button
- Show count of unprocessed records (trust_score = 100 AND audit_flags = [])
- Add face detection on stored photos (fetch photo URL, run detection, update record)

---

## Files to Modify

1. **`src/components/TimeClock/CameraCapture.tsx`** — Add real-time face detection indicator
2. **`src/components/TimeClock/ClockButton.tsx`** — Fix face result propagation, add logging
3. **`src/components/TimeClock/useFaceDetection.ts`** — More robust error handling, always return flags
4. **`src/components/TimeClock/useAuditEngine.ts`** — Lower location threshold, add city detection, reduce minimum records
5. **`src/components/TimeClock/AuditDashboard.tsx`** — Add photo re-analysis for historical records

---

## Key Changes Summary

### Face Detection (Immediate Feedback)
```text
User takes photo → Face detection runs on canvas → 
If face found: Green indicator "Rosto detectado ✓"
If NO face: Red warning "Nenhum rosto detectado!" + option to retake
User confirms → Score calculated with face result
```

### Location Scoring (Enhanced)
```text
Current: 5km threshold, needs 3+ previous records
New: 2km threshold, needs 1+ previous records, city comparison
New flag: 'cidade_diferente' (-20) when city name changes
```

### Historical Photo Re-Analysis
```text
Fetch photo URL → Load image → Run face detection → 
Update trust_score and audit_flags → Show progress
```
