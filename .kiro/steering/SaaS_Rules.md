# Kiro Steering File: SaaS Absensi & Manajemen Boarding School

## 1. Project Overview & Identity
- **Product Name:** SaaS Absensi & Manajemen Boarding School (Pondok Pesantren)
- **Concept:** Multi-tenant SaaS platform tailored for boarding schools (similar to "Sekolah Rakyat").
- **Current Repository Structure:** Only contains a `backend/` folder. All future modules (frontend/mobile apps) should be organized at the root level alongside it.
- **Development Philosophy:** Token-efficient, spec-driven development. Always create or update `tasks.md` before writing substantial code. Avoid "vibe coding" or endless autopilot loops.

## 2. Core Architecture Rules (Multi-Tenancy)
- **Data Isolation:** Every query, database table, or data sheet must include a unique identifier for the school/pondok (`tenant_id`). Data between institutions must never leak.
- **Role-Based Access Control (RBAC):** Users must be tightly scoped into roles: Super Admin (SaaS owner), Tenant Admin (School Principal/Head of Pondok), Staff/Teachers (Ustadz/Ustadzah), Security (Keamanan), and Parents (Wali Santri).
- **Self-Healing Systems:** Prioritize modular, self-configuring code (e.g., automated creation of folders/sheets per tenant if needed, gracefully handling missing configurations without crashing).

## 3. Tech Stack Requirements (Backend Focused)
- **Primary Environment:** Focus on the existing `backend/` directory.
- **Language & Frameworks:** [AI to detect existing language in backend/ on first run, but default to clean, modular, and asynchronous patterns].
- **Integrations (Future):**
  - Android/Flutter apps for QR Code and NFC hardware scanning.
  - Telegram Bots for automated notifications to parents (Wali Santri) regarding attendance and violations.
  - Midtrans QRIS for automated SaaS monthly subscription payments.

## 4. Token & Credit Efficiency Guardrails
- **Supervised Mode First:** Do not run large automated changes without user confirmation.
- **Scope Limitation:** Focus only on one single task or file at a time. Do not attempt to refactor the entire `backend/` in one prompt.
- **Incremental Testing:** Write simple, verifiable unit tests or test endpoints for every new feature to catch bugs early before they waste execution credits.
- **Feedback Loop:** If a specific implementation fails twice, stop immediately, explain the bottleneck to the user, and ask for architectural guidance.
- **Quick Plan Mode:** Use Quick Plan for small bug fixes or minor refactors inside `backend/` to bypass heavy spec generation cycles.
