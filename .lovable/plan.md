Transform the existing application into a high-end solution (comparable to Monday.com, HubSpot) by implementing advanced customization, automation, and enhanced UI/UX.

### Phase 1: Core System Upgrades (Current Step)
Focus on the immediate requests for "Leads Premium" and "Leads AGibank" while laying the foundation for global system improvements.

1. **Refine Leads Premium and Leads AGibank:**
    - Improve the Export functionality to allow field selection and deeper filtering (User, Period, Status, etc.).
    - Remove the "Simulations" field as requested.
    - Implement a more robust "Performance-based Credit Request" system with a dedicated UI for both Users (to request) and Admins (to approve).

2. **Advanced Data Management Foundation:**
    - Create a framework for **Customizable Fields** starting with the Leads module. This involves a metadata-driven approach where fields can be added/removed by admins.
    - Implement **Dynamic Forms** that adapt based on user roles or lead categories.

3. **Intelligent Automation (The "Monday.com" feel):**
    - Scaffold a "Workflow Builder" prototype specifically for lead processing (e.g., "If status changes to X, notify user Y").
    - Enhance notifications with real-time feedback and @mentions support.

4. **Premium UI/UX Enhancements:**
    - Integrate `Aceternity UI` or `Magic UI` components for a modern, fluid feel (e.g., animated containers, better empty states, smoother transitions).
    - Implement a **Global Search** overlay accessible via `Cmd/Ctrl+K`.

### Technical Details (Implementation Plan)

1. **Database Schema Enhancements:**
    - Update `leads` table to support a `metadata` JSONB column for custom fields.
    - Finalize `agibank_credit_requests` table (already approved).
    - Create a `system_automations` table to store trigger-action rules.

2. **Frontend Architecture:**
    - Create a `CustomFieldRenderer` component to handle different data types (Select, Date, Multi-select, etc.).
    - Update `LeadsListView` and `LeadsAgibankModule` to use this renderer.
    - Refactor `ExportLeadsDialog` to include a checklist of fields to export.

3. **Global Search Implementation:**
    - Create a `CommandMenu` component using `cmdk` (already in `package.json`).
    - Index key modules: Leads, Clients, Proposals, and Navigation.

4. **Component Library Integration:**
    - Use `shadcn/ui` for high-quality, accessible base components.
    - Layer in `framer-motion` for meaningful UI transitions (the "Monday.com" polish).

### Priority
- **High:** Leads Export refinement, Credit Request UI, Removal of "Simulations".
- **Medium:** Global Search, Custom Fields framework.
- **Low:** Workflow Builder (Phase 2), External Integrations (Slack/Zapier).