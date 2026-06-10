The investigation revealed that the leads for "GOV BA" (Servidores da Bahia) in the database currently have invalid phone numbers (all starting with "0000..."). 

The filtering logic in the `preview_requested_leads_count` RPC function uses the first 2 digits of the phone number as the DDD:
```sql
AND (ddd_filter IS NULL OR LEFT(ld.phone, 2) = ANY(ddd_filter))
```

When a user selects "Bahia (BA)", the system automatically applies a DDD filter (e.g., ['71', '73', '74', '75', '77']). Since all leads have phones starting with '00', they are all filtered out, resulting in "0 encontrados".

**Plan:**
1.  **Persist Uploads**: Save the new images to `/public/uploads/`.
2.  **Fix Database Function**: Modify `preview_requested_leads_count` to only apply the DDD filter if the phone number appears valid (e.g., doesn't start with '00'). For "GOV BA" specifically, we should probably rely on the `estado` column if available, or allow the leads even if the DDD doesn't match the state when the data is clearly placeholder data.
3.  **Adjust Wizard Logic**: In `StepPerfil.tsx`, when selecting an state (UF), we will still set the DDDs for other modules, but I'll ensure the `isConvenioModule` path doesn't strictly block leads based on DDD if the data is incomplete.
4.  **Database Migration**: Update the RPC to be more flexible with DDD filtering when data quality is low.

### Technical Details

**1. File Persistence**
*   Save `colado-1781103135153.png` and `colado-1781103165196.png` to `/public/uploads/`.

**2. Update Database Function (SQL)**
*   Update `preview_requested_leads_count` to handle the case where leads have invalid phones by ignoring the DDD filter for them if the filter is set but no leads match due to the '00' prefix. Or better, allow filtering by `estado` column which I saw exists in the table.

**3. Update `src/modules/leads-premium/components/RequestLeadsWizard/StepPerfil.tsx`**
*   Modify how `onUpdate` is called when `uf` changes for `isConvenioModule`. If it's the convenio module, we might want to pass `uf` to the RPC instead of just relying on derived DDDs.

**4. Update `src/modules/leads-premium/components/RequestLeadsWizard/types.ts`**
*   Add `uf` as an optional parameter to the `preview_requested_leads_count` RPC call.
