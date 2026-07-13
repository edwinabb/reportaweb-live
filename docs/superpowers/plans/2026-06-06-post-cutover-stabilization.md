# Post-Cutover Stabilization & System Optimization Plan

> **For agentic workers:** Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan. Tasks use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize E2E tests via JWT TTL fix, complete critical migration (P4), audit BD state post-cutover, identify blockers, and establish systematic improvements for performance, security, documentation, and product competitiveness.

**Architecture:** 6-phase sequential plan with dependencies. Phases 1-5 are single-session (achievable today: ~4-5 hours). Phase 6 is systemic improvements requiring ongoing iterations; we'll define the roadmap and kick off initial work today.

**Tech Stack:** 
- Next.js 16 (reportaweb3), Expo 54 (reporta-app)
- Supabase (PROD: Brazil, TEST: USA)
- E2E: Playwright
- Performance: Lighthouse, Chrome DevTools, Supabase Analytics
- Security: code-review, OWASP checklist

---

## Phase 1: JWT TTL Configuration (Blocker Fix)

**Goal:** Increase Supabase TEST JWT expiry from 1h → 2h to prevent refresh_token consumption during E2E suite runtime.

**Rationale:** E2E suite runs ~39 min. With TTL=60min, token expires mid-suite → forces refresh → consumes refresh_token → viewer.json becomes invalid → 19+ tests fail. TTL=120min covers entire suite without refresh.

**Reference:** `project_p1_e2e_viewer_fix.md` lines 93-108

### Task 1.1: Update Supabase TEST JWT Expiry

**Files:** None (Supabase dashboard — manual change)

- [ ] **Step 1: Access Supabase TEST dashboard**
  - URL: `https://supabase.com/dashboard/project/wioozisskjjgjjybsoqo`
  - Login with `info@reporta.la`

- [ ] **Step 2: Navigate to Authentication settings**
  - Left sidebar → Authentication → Settings
  - Scroll to "JWT expiry"
  - Current value: `3600` (seconds)

- [ ] **Step 3: Change TTL to 7200 seconds**
  - Change: `3600` → `7200`
  - Click "Save"
  - Verify success message appears

- [ ] **Step 4: Document the change**
  - Note timestamp: [when completed]
  - No code commit needed

**Expected outcome:** JWT TTL in TEST now matches PROD stability requirements. E2E tests will not trigger mid-suite refreshes.

---

## Phase 2: E2E Test Validation

**Goal:** Run full E2E suite post-TTL change to validate the fix improves pass rate.

### Task 2.1: Run Full E2E Suite

**Files:**
- Test runner: `tests/auth/setup-base.ts` (read-only verification)
- Test config: `playwright.config.ts`

- [ ] **Step 1: Verify E2E environment setup**

  Run from `c:\Proyectos\reportaweb3`:
  ```bash
  npx playwright test --list
  ```
  Expected: Should list 388 tests without errors

- [ ] **Step 2: Run full E2E suite with reporting**

  Run:
  ```bash
  npx playwright test --reporter=html > e2e-run-$(date +%Y%m%d-%H%M%S).log 2>&1
  ```
  
  This will:
  - Execute all 388 tests sequentially
  - Generate HTML report in `playwright-report/`
  - Estimated duration: ~45-50 minutes
  - Log file for reference

- [ ] **Step 3: Extract and document results**

  After completion, run:
  ```bash
  npx playwright show-report
  ```
  
  Capture final metrics:
  - Total tests run: [#]
  - Passed: [#]
  - Failed: [#]
  - Pass rate: [%]
  - Compare against baseline (366/388 = 94.3%)

- [ ] **Step 4: Analyze failures (if any)**

  For each failure, note:
  - Test name
  - Error message
  - Category (auth, UI, data, timing)
  - Is it new or pre-existing?

- [ ] **Step 5: Document findings in CLAUDE.md**

  Add section `## E2E Status Post-TTL-Fix`:
  ```markdown
  ### Run: [timestamp]
  - **Before TTL fix:** 366/388 (94.3%)
  - **After TTL fix:** [#]/388 ([%])
  - **Change:** +[#] tests
  - **New failures:** [list or "none"]
  - **Root causes (if new):** [analysis]
  - **Next action:** [recommendation]
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add CLAUDE.md
  git commit -m "docs: E2E validation post-TTL-fix — $(date +%Y-%m-%d)"
  ```

**Expected outcome:** E2E pass rate should increase from 94.3% (366/388) to ≥95% (366+/388). If ≥99% (387+/388), P1 is closed. Remaining failures belong to P2-P5 items.

---

## Phase 3: Complete P4 Migration (inspections_detalles)

**Goal:** Execute migration script v3 to close the 9.4% gap in inspections_detalles (287,876 → 317,878 records).

**Rationale:** Original deadline was 2026-06-03; we're 3 days behind. Script `migrate-inspecciones-detalles-v3.ts` uses year-based paging to work around Bubble API's 50k limit.

**Reference:** `project_migracion_bubble_plan.md` lines 65-88

### Task 3.1: Execute Migration Script v3

**Files:**
- Script: `scripts/migrate-inspecciones-detalles-v3.ts`
- Pre-migration audit: `scripts/audit-inspecciones-bubble.ts`

- [ ] **Step 1: Pre-flight checks**

  Run audit script to understand current state:
  ```bash
  cd c:\Proyectos\reportaweb3
  npx ts-node scripts/audit-inspecciones-bubble.ts --prod
  ```
  
  Expected output:
  ```
  Bubble Total: ~317,878
  Supabase Current: 287,876 (90.6%)
  Gap: ~30,000 (9.4%)
  Windows to process: 16 (2019-2027, annual)
  ```

- [ ] **Step 2: Start migration (dry-run first)**

  Run with `--dry-run` to preview:
  ```bash
  npx ts-node scripts/migrate-inspecciones-detalles-v3.ts --dry-run --prod
  ```
  
  Expected output:
  - Shows which windows will be processed
  - Estimated record counts per window
  - Estimated duration
  - **Do NOT apply changes yet**

- [ ] **Step 3: Execute migration (live)**

  Run live migration:
  ```bash
  npx ts-node scripts/migrate-inspecciones-detalles-v3.ts --run --prod
  ```
  
  Monitor:
  - Bubble API rate limits (should see progress every few sec)
  - DB insert success (no FK violations)
  - Script should take 20-40 minutes depending on network
  - Watch for errors; if found, note and escalate

- [ ] **Step 4: Post-migration verification**

  After script completes, verify:
  ```bash
  npx ts-node scripts/audit-inspecciones-bubble.ts --prod --verify
  ```
  
  Expected output:
  ```
  Bubble Total: ~317,878
  Supabase Current: [should be ≥310,000 = 97%+]
  Gap: [should be ≤7,878 = <2.5%]
  Duplicates: 0
  FK errors: 0
  ```

- [ ] **Step 5: Analyze remaining gap (if >0)**

  If gap remains, document reasons:
  ```bash
  npx ts-node scripts/audit-inspecciones-bubble.ts --prod --find-orphans
  ```
  
  Categorize remaining records:
  - Without valid `inspeccion_id` (FK fail) — %
  - Outside date range coverage — %
  - Other constraint violation — %
  
  Create issue: `[P4-residual] inspecciones_detalles final gap analysis`

- [ ] **Step 6: Commit**

  ```bash
  git add docs/migration-reports/
  git commit -m "feat: complete inspecciones_detalles migration v3 — gap closed $(date +%Y-%m-%d)"
  ```

**Expected outcome:** inspecciones_detalles ≥97% (310k+ / 317.8k). Remaining <3% gap documented with root causes. Migration considered complete enough for PROD cutover (planned for later phase if needed).

---

## Phase 4: Migration Audit & BD State Review

**Goal:** Audit what succeeded and what failed during Bubble→Supabase migration. Document gaps, constraints, and lessons for future data operations.

**Rationale:** Memory shows 90.6% completion on inspecciones_detalles but gaps on other tables (terceros 83%, cotizaciones 60% huérfanos). We need to understand root causes to maintain data integrity during future operations.

### Task 4.1: Full Migration State Audit

**Files:**
- Audit output: Create `docs/migration-audits/audit-2026-06-06.md`
- Data: Queries against PROD Supabase

- [ ] **Step 1: Connect to Supabase PROD**

  Use Supabase client or SQL editor:
  ```bash
  # Using supabase CLI
  cd c:\Proyectos\reportaweb3
  supabase projects list
  # Should show: fqwhagryqkkhbgznxtwf (PROD)
  ```

- [ ] **Step 2: Audit table-by-table migration status**

  Run this query for each major table to get record counts (Bubble vs Supabase):
  
  ```sql
  -- Template: Run for each table
  SELECT 
    'inspecciones_detalles' as table_name,
    COUNT(*) as supabase_count,
    COUNT(DISTINCT bubble_id) as unique_bubble_ids,
    COUNT(CASE WHEN inspeccion_id IS NULL THEN 1 END) as orphans_fk_null,
    COUNT(CASE WHEN created_at::date > '2026-01-01' THEN 1 END) as recent_records
  FROM inspecciones_detalles;
  ```
  
  Repeat for:
  - `inspecciones_detalles` (primary focus)
  - `reportes_personal`
  - `reportes_maquinaria`
  - `terceros_contactos`
  - `cotizaciones_matriz`
  - `planes_accion`
  
  Document each result.

- [ ] **Step 3: Identify orphaned/failed records**

  For tables with gaps, find orphans:
  ```sql
  -- Example: inspecciones_detalles with no valid inspeccion_id
  SELECT COUNT(*) as orphaned_count
  FROM inspecciones_detalles
  WHERE inspeccion_id IS NULL OR inspeccion_id NOT IN (SELECT id FROM inspecciones);
  
  -- Example: records outside coverage date range
  SELECT COUNT(*) as out_of_range
  FROM inspecciones_detalles
  WHERE created_at < '2019-01-01' OR created_at > '2026-06-06';
  ```

- [ ] **Step 4: Document gaps and root causes**

  Create `docs/migration-audits/audit-2026-06-06.md`:
  
  ```markdown
  # Migration Audit — 2026-06-06
  
  ## Summary
  - **Cutover Date:** 2026-05-30
  - **Audit Date:** 2026-06-06
  - **Overall Completion:** [%]
  
  ## Table Status
  
  ### inspecciones_detalles
  - **Supabase Count:** [#]
  - **Bubble Total:** 317,878
  - **Coverage:** [%]
  - **Orphans (FK null):** [#]
  - **Out-of-range:** [#]
  - **Status:** ✅ Complete / ⚠️ [gap reason]
  
  ### [Other tables...]
  
  ## Root Causes for Gaps
  
  | Table | Gap % | Root Cause | Severity |
  |---|---|---|---|
  | inspecciones_detalles | 3% | Orphaned records, FK constraints | Low (historical) |
  | terceros_contactos | 17% | Missing parent tercero_id | Medium |
  | [etc] | | | |
  
  ## Impact Assessment
  
  - **Data Integrity:** [Safe / At risk]
  - **Reporting Impact:** [None / [specific queries]]
  - **Customer Impact:** [None / [specific features]]
  
  ## Remediation Options
  
  - Option 1: [Accept gap, document as historical data]
  - Option 2: [Backfill with defaults]
  - Option 3: [Investigate Bubble API limitations further]
  
  ## Lessons for Future Operations
  
  1. Bubble API 50k limit requires pre-planning
  2. Date-based paging essential for large tables
  3. FK constraints must be validated pre-migration
  ```

- [ ] **Step 5: Compare against original migration plan**

  Reference: `project_migracion_bubble_plan.md`
  
  Create comparison table:
  ```markdown
  ## Plan vs Actual
  
  | Task | Planned | Actual | Status |
  |---|---|---|---|
  | P1 tarea_id backfill | 99.5% | [actual] | ✅ / ⚠️ |
  | P3 cotizaciones_matriz | 100% | [actual] | ✅ / ⚠️ |
  | P4 inspecciones_detalles | 100% | [actual] | ✅ / ⚠️ |
  | P5 CDN→Storage | 100% | 428/481 | ⚠️ [reason] |
  ```

- [ ] **Step 6: Commit audit report**

  ```bash
  git add docs/migration-audits/audit-2026-06-06.md
  git commit -m "docs: migration audit post-cutover — document state + lessons learned"
  ```

**Expected outcome:** Complete audit documenting what succeeded, what failed, why, and impact. Actionable remediation options for each gap.

---

## Phase 5: Identify Blockers & Prioritize

**Goal:** Scan outstanding issues, PRs, E2E failures, and infrastructure issues to identify what's preventing PROD stability or next features.

### Task 5.1: Blocker Inventory

**Files:**
- Output: `docs/blockers/blockers-2026-06-06.md`

- [ ] **Step 1: Collect E2E failures**

  From Phase 2 results, list all failing tests:
  ```bash
  # If you saved results to HTML report earlier
  # Analyze and extract failure names
  echo "Failed tests from Phase 2:" > docs/blockers/blockers-2026-06-06.md
  ```
  
  Add each failure with:
  - Test name
  - Error
  - Impact (critical/high/medium/low)
  - Dependency (blocks other work?)

- [ ] **Step 2: Scan GitHub issues (if using GitHub)**

  If tracking in GitHub, search:
  ```bash
  # Pseudo-command — adapt to your issue tracker
  # gh issue list --state=open --label=blocker
  # OR in Linear, Jira, etc.
  ```
  
  Document blocking issues:
  - Title
  - Status
  - Assigned to
  - Blocking which feature/release

- [ ] **Step 3: Review memory/docs for pending tasks**

  Check `MEMORY.md`:
  ```
  - P1 E2E viewer auth: ✓ (TTL fix pending — in progress)
  - P2 Flow 6 fix: [status?]
  - P3 Toggle INTERNO/EXTERNO: [status?]
  - P4 inspecciones_detalles: ✓ (in progress)
  - P5 Trial registration: [status?]
  ```
  
  Update each with current status:
  - ✅ Done
  - 🔄 In progress
  - ⏳ Waiting for (specify: blocked by what)
  - ❌ Failed (why)

- [ ] **Step 4: Infrastructure & performance issues**

  Based on user report "slow system":
  - [ ] Is Supabase responsive? Check logs for slow queries
  - [ ] Are there pending DB migrations?
  - [ ] Is Vercel deployment healthy? Check build/edge function latency
  - [ ] App (reporta-app): any pending Play Store issues?

  Add to blockers doc:
  ```markdown
  ## Infrastructure Issues
  
  ### Performance (Reported by client)
  - **Symptom:** Slow data load times
  - **Severity:** HIGH (customer-facing)
  - **Investigation needed:** [Phase 6b]
  
  ### [Other issues...]
  ```

- [ ] **Step 5: Create prioritized blocker list**

  Template:
  ```markdown
  # Blockers — 2026-06-06
  
  ## 🔴 Critical (Release blocker)
  1. [Blocker] — blocks [release/feature]
  2. [Blocker] — blocks [release/feature]
  
  ## 🟠 High (Customer impact)
  1. [Blocker] — affects [feature/users]
  
  ## 🟡 Medium (Process blocker)
  1. [Blocker] — delays [task/phase]
  
  ## 🔵 Low (Nice to fix)
  1. [Blocker] — low impact
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add docs/blockers/
  git commit -m "docs: inventory of blockers and prioritization — 2026-06-06"
  ```

**Expected outcome:** Clear list of 5-20 blockers with severity, impact, and owner. Clear path forward for priorities.

---

## Phase 6: Systemic Improvements (Multi-Session Roadmap)

**Goal:** Establish documentation structure, diagnose and optimize performance, audit security, ideate competitive features, and evaluate cross-cutting system parameters. This phase is intentionally decomposed into sub-initiatives that will unfold over multiple sessions.

### 6a: Documentation & Maintenance Structure

**Scope:** Create organized, maintainable knowledge base for operations, architecture, performance, and data.

**Files to create:**
- `docs/operations/` — deployment, runbooks, incident response
- `docs/architecture/` — system design, data flow, decisions
- `docs/performance/` — profiling results, optimization notes
- `docs/security/` — audit findings, compliance checklist
- `docs/features/` — competitive features analysis

### 6b: Performance Analysis & Optimization

**Scope:** Diagnose why client reports "slow system", identify bottlenecks, propose optimizations.

**Key questions to answer:**
1. Is slowness in API response times, data transfer, or frontend render?
2. Which queries are slowest? (DB profiling)
3. Are there N+1 query patterns?
4. Is image/file serving optimized?
5. What's the bundle size trend?
6. Are we over-fetching data?

**Deliverables:** Performance audit report + 5-10 optimization recommendations ranked by effort/impact.

### 6c: Security Audit

**Scope:** Review auth, data access controls, secrets management, API security.

**Focus areas:**
1. JWT handling (post-TTL fix, are refresh tokens secure?)
2. RLS policies in Supabase (are they tight enough?)
3. API endpoints (are they authenticated?)
4. Secrets (env vars, .env files, are they safe?)
5. User input validation (XSS, SQL injection risks?)
6. OWASP Top 10 checklist

**Deliverable:** Security audit report + risk matrix + remediation plan.

### 6d: Competitive Features Brainstorming

**Scope:** Ideate 5-7 features that would make clients prefer reportaweb3 + reporta-app over competitors.

**Context:** 
- Current system: inspection/checklist reporting, asset management, task tracking
- Market: similar tools exist (Infobip-like systems, construction inspection apps, etc.)
- Target users: field technicians, project managers, asset managers

**Method:** Brainstorm features addressing:
- Ease of use (mobile-first experience)
- Real-time collaboration (live updates, notifications)
- Intelligence (ML-based anomaly detection, predictive maintenance)
- Integration (third-party tools, automations)
- Customization (role-based templates, branding)

**Deliverable:** Feature proposals with user stories, business impact, and implementation effort estimates.

### 6e: Cross-Cutting System Parameters Evaluation

**Scope:** Evaluate non-functional aspects affecting overall system quality.

**Parameters to assess:**
1. **Scalability:** Can the system handle 10x more users/data without major changes?
2. **Reliability:** What's our uptime target? SLA tracking?
3. **Cost:** Are we optimizing cloud spend (Supabase, Vercel, S3 storage)?
4. **Observability:** Do we have logging/monitoring/alerting set up?
5. **Developer experience:** How easy is it to onboard new features?
6. **Testing coverage:** What % of code is tested? E2E vs unit vs integration?
7. **Data freshness:** Are there stale caches, denormalized tables, ETL latencies?

**Deliverable:** System parameters matrix + improvement roadmap.

---

## Execution Path

**Today (Session 1):**
- ✅ Phase 1: JWT TTL fix (5 min)
- ✅ Phase 2: E2E validation (45 min)
- ✅ Phase 3: P4 migration (90 min)
- ✅ Phase 4: Migration audit (60 min)
- ✅ Phase 5: Blocker inventory (30 min)
- **Total: ~4.5 hours**

**Recommended: Stop here, review findings, plan Phase 6 in next session.**

**Phase 6 (Future sessions):**
- 6a: Documentation (60 min) — create structure, seed initial docs
- 6b: Performance audit (120 min) — profiling, analysis, recommendations
- 6c: Security audit (90 min) — code review, RLS validation
- 6d: Feature brainstorming (60 min) — ideas + user stories
- 6e: System parameters (90 min) — assessment + roadmap

**Total Phase 6: ~6 hours over 2-3 sessions**

---

## Success Criteria

| Phase | Success Metric |
|---|---|
| 1 | JWT TTL in TEST changed to 7200s, verified in dashboard |
| 2 | E2E suite run complete; pass rate ≥95% or new failures attributed to P2-P5 items |
| 3 | inspecciones_detalles ≥97% complete; remaining gap <3% with documented root causes |
| 4 | Audit report complete; all gaps categorized and impact assessed |
| 5 | Blocker inventory complete; 5-20 items prioritized with ownership |
| 6 | Roadmap and initial structure for documentation, performance, security, features |

---

## Notes for Implementation

- **Supabase dashboard access:** Ensure `info@reporta.la` can access TEST project `wioozisskjjgjjybsoqo`
- **Script execution:** Migrations v3 script tested locally first with `--dry-run`
- **E2E duration:** Expect 45-50 minutes for full suite; plan accordingly
- **Commit frequency:** One commit per phase (smaller granularity per task if subagent-driven)
- **Rollback plan:** If P4 migration causes issues, rollback is: `DELETE FROM inspecciones_detalles WHERE bubble_id > [last_good_id]`
