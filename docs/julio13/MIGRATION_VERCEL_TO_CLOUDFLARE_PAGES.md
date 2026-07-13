# 🚀 Migration Plan: Vercel → Cloudflare Pages

**Date:** 2026-07-14  
**Status:** 📋 READY FOR EXECUTION  
**Target:** Migrate reporta.app (all subdomains) from Vercel to Cloudflare Pages  
**Timeline:** 3-4 days  
**Risk Level:** 🟡 Medium (but fully mitigable with staging + rollback plan)  
**Cost Impact:** Vercel $20/mo → Cloudflare Pro $20/mo (SAME COST, better performance)

---

## 🎯 Objectives

```
✅ Migrate web.reportar.app (current staging)
✅ Migrate demo.reportar.app (demo environment)
✅ Migrate live.reportar.app (production)
✅ Eliminate Vercel completely
✅ Improve latency 50-70% in Latinamerica
✅ Maintain zero downtime (staging first)
```

---

## 📋 Pre-Requisites

Before starting, verify:

```
[ ] Cloudflare Pro plan upgraded ($20/month)
    - URL: https://dash.cloudflare.com/billing/plan
    - Current: Free → Pro
    
[ ] reportar.app zone exists in Cloudflare
    - Verify: https://dash.cloudflare.com
    
[ ] Git repository is clean (no uncommitted changes)
    - Run: git status
    
[ ] .env.local has all required variables
    - SUPABASE_PROJECT_ID
    - SUPABASE_API_URL
    - SUPABASE_ANON_KEY
    - SUPABASE_SERVICE_ROLE_KEY
    
[ ] Backup current Vercel deployment
    - Export: Settings → Deployments → Download logs
    
[ ] Team briefed on migration plan
    - Timeline: 3-4 days
    - Downtime: ~5-10 minutes per domain
    - Rollback: Possible if needed
```

---

## 🏗️ Architecture

### Current (Vercel)
```
web.reportar.app     → Vercel Edge    → Next.js App
demo.reportar.app    → Vercel Edge    → Next.js App
live.reportar.app    → Vercel Edge    → Next.js App
                                ↓
                          Supabase
```

### Target (Cloudflare Pages)
```
web.reportar.app     → Cloudflare Pages → Next.js App (Edge)
demo.reportar.app    → Cloudflare Pages → Next.js App (Edge)
live.reportar.app    → Cloudflare Pages → Next.js App (Edge)
                                ↓
                          Supabase
```

**Benefits:**
- Better latency in Latinamerica (Cloudflare PoPs in Bogotá, Quito, Lima, São Paulo)
- Same cost ($20/mo)
- Better DDoS protection
- Native Next.js support via Pages Functions

---

## 📊 Phase Breakdown

### Phase 1: Setup & Staging (2-3 hours)
- [ ] Upgrade Cloudflare to Pro plan
- [ ] Configure Next.js for Cloudflare Pages
- [ ] Setup environment variables
- [ ] Deploy to staging (web.reportar.app)
- [ ] Validate: performance, functionality, no regressions

### Phase 2: Demo Environment (1-2 hours)
- [ ] Deploy demo.reportar.app
- [ ] Run full smoke tests
- [ ] Validate with team (if applicable)
- [ ] Wait 24-48h for monitoring

### Phase 3: Production (2-3 hours + 48h monitoring)
- [ ] DNS cutover for live.reportar.app
- [ ] Intense monitoring (first 2 hours)
- [ ] Continuous monitoring (48 hours)
- [ ] Rollback plan ready

### Phase 4: Cleanup (1 hour)
- [ ] Delete Vercel project
- [ ] Delete Vercel organization
- [ ] Cancel Vercel Pro subscription
- [ ] Document migration results

---

## 🔧 Step-by-Step Instructions

### STEP 1: Upgrade Cloudflare to Pro Plan (15 min)

**Action:**
```
1. Go to: https://dash.cloudflare.com/billing/plan
2. Click: "Upgrade to Pro" on reportar.app
3. Select: Monthly billing ($20/mo)
4. Complete payment
5. Wait for activation (usually instant, max 5 min)
```

**Verification:**
```bash
# After upgrade, verify:
curl -s https://dash.cloudflare.com/profile/api-tokens
# Should show: Cloudflare Pro features available
```

---

### STEP 2: Configure Next.js for Cloudflare Pages (30 min)

**Action:** Modify `next.config.ts`

```typescript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... existing config ...
  
  // Cloudflare Pages optimization
  experimental: {
    webpackBuildWorker: false, // Cloudflare Workers compatibility
  },
  
  // Headers for Cloudflare caching
  headers: async () => [
    {
      source: '/api/:path*',
      headers: [
        { key: 'Cache-Control', value: 'private, no-cache' },
      ],
    },
    {
      source: '/:path*.(jpg|jpeg|png|gif|svg|webp)',
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
      ],
    },
  ],
  
  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  },
};

module.exports = nextConfig;
```

**File to modify:** `C:\Proyectos\reportaweb3\next.config.ts`

**Changes:**
- Add experimental settings for Cloudflare
- Add cache headers
- Verify env variables

---

### STEP 3: Create `wrangler.toml` (15 min)

**Create new file:** `C:\Proyectos\reportaweb3\wrangler.toml`

```toml
# Cloudflare Pages configuration for reporta.app

name = "reportaweb3"
type = "javascript"
account_id = "e8ccb5b6899509f1f9fdffa5cad4e615"  # From wrangler whoami
workers_dev = false

# Build configuration
build = { command = "npm run build" }
build_watch_paths = ["src/**/*.tsx", "app/**/*.tsx"]
site = { include = "out" }

# Environment: staging (web.reportar.app)
[env.staging]
vars = { ENVIRONMENT = "staging" }
routes = [
  { pattern = "web.reportar.app", zone_name = "reportar.app" }
]

# Environment: demo (demo.reportar.app)
[env.demo]
vars = { ENVIRONMENT = "demo" }
routes = [
  { pattern = "demo.reportar.app", zone_name = "reportar.app" }
]

# Environment: production (live.reportar.app)
[env.production]
vars = { ENVIRONMENT = "production" }
routes = [
  { pattern = "live.reportar.app", zone_name = "reportar.app" }
]

# Bindings (if using KV, Durable Objects, etc.)
# [[kv_namespaces]]
# binding = "KV"
# id = "..."
```

**File location:** `C:\Proyectos\reportaweb3\wrangler.toml`

---

### STEP 4: Setup Environment Variables for Cloudflare (10 min)

**Action:** Add to `.env.local` (already partially there)

Verify these exist:
```
SUPABASE_PROJECT_ID="fqwhagryqkkhbgznxtwf"
SUPABASE_API_URL="https://fqwhagryqkkhbgznxtwf.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Action:** Add to `wrangler.toml`

```toml
# Environment variables for all environments
[env.staging]
vars = { 
  NEXT_PUBLIC_SUPABASE_URL = "https://fqwhagryqkkhbgznxtwf.supabase.co"
  ENVIRONMENT = "staging"
}

[env.demo]
vars = { 
  NEXT_PUBLIC_SUPABASE_URL = "https://fqwhagryqkkhbgznxtwf.supabase.co"
  ENVIRONMENT = "demo"
}

[env.production]
vars = { 
  NEXT_PUBLIC_SUPABASE_URL = "https://fqwhagryqkkhbgznxtwf.supabase.co"
  ENVIRONMENT = "production"
}
```

---

### STEP 5: Deploy to Staging (web.reportar.app) (30 min)

**Prerequisites:**
- [ ] Wrangler CLI installed: `npm install -g wrangler`
- [ ] Authenticated: `wrangler auth login`
- [ ] Next.js built locally: `npm run build`

**Action: Deploy**

```bash
# Terminal: Navigate to project
cd C:\Proyectos\reportaweb3

# Build Next.js
npm run build

# Deploy to Cloudflare Pages (staging)
wrangler pages deploy ./out --project-name=reportaweb3-staging --env staging

# Or use GitHub integration (if set up):
# Push to GitHub, Cloudflare auto-deploys
git add .
git commit -m "chore: configure for Cloudflare Pages deployment"
git push origin master
```

**Expected output:**
```
✅ Deployment successful!
URL: https://web.reportar.app
```

---

### STEP 6: Validation Tests - Staging (30 min)

**Test 1: Basic Functionality**
```bash
# Open in browser
https://web.reportar.app

# Verify:
[ ] Page loads in <2 seconds
[ ] No 404 errors
[ ] No console errors (F12)
[ ] Navigation works
```

**Test 2: Supabase Connection**
```bash
# In browser console, verify:
[ ] Can login to app
[ ] Can fetch data from database
[ ] No auth errors
[ ] WebSocket (real-time) works if used
```

**Test 3: Performance**
```bash
# Open DevTools → Network
[ ] Assets cached (if Cloudflare cache working)
[ ] API responses <500ms
[ ] Page load time recorded
```

**Test 4: Cloudflare Features**
```bash
# Verify Cloudflare is actually proxying:
curl -I https://web.reportar.app | grep "cf-"
# Should show: cf-cache-status, cf-ray, etc.
```

**If all tests pass:** ✅ Continue to Phase 2  
**If any test fails:** ❌ Troubleshoot before proceeding

---

### STEP 7: Deploy to Demo (demo.reportar.app) (15 min)

**Same as Step 5, but for demo environment:**

```bash
wrangler pages deploy ./out --project-name=reportaweb3-demo --env demo
```

**Validation:** Same 4 tests as Step 6, on `https://demo.reportar.app`

---

### STEP 8: Deploy to Production (live.reportar.app) (30 min + monitoring)

⚠️ **CRITICAL PHASE** — requires careful monitoring

**Pre-Deployment Checklist:**
```
[ ] Staging (web.reportar.app) validated ✅
[ ] Demo (demo.reportar.app) validated ✅
[ ] Team briefed and ready
[ ] Monitoring dashboards open (Sentry, Cloudflare)
[ ] Rollback plan reviewed
[ ] On-call person assigned
```

**Action: Deploy**

```bash
wrangler pages deploy ./out --project-name=reportaweb3-live --env production
```

**Immediate Monitoring (First 30 min - CRITICAL):**

Every 5 minutes, check:
```bash
# 1. Site loads
curl -I https://live.reportar.app
# Expected: 200 OK, cf-cache-status header

# 2. Check Sentry for errors
# URL: https://sentry.io/reportaweb3
# Look for: No spike in errors

# 3. Check Cloudflare Analytics
# URL: https://dash.cloudflare.com/live.reportar.app
# Metrics: Request count, error rate, cache status

# 4. Manual smoke test
# Open: https://live.reportar.app
# Login, test core features
```

**Extended Monitoring (Next 2 hours - MODERATE):**

Every 15 minutes:
- Same checks as above
- Monitor Sentry error rate trend
- Check database performance (Supabase)

**Continuous Monitoring (Next 48 hours - LIGHT):**

Every 4 hours:
- Site accessible
- No error spikes
- Performance normal
- Customer feedback (if any)

---

### STEP 9: Cleanup (1 hour)

**Only after Phase 3 is stable (48h+):**

```bash
# 1. Delete Vercel project
#    URL: https://vercel.com/dashboard
#    Project: reportaweb3 → Settings → Delete

# 2. Cancel Vercel subscription
#    URL: https://vercel.com/account/billing
#    Plan: Downgrade/Cancel Pro

# 3. Remove Vercel from git (if integrated)
#    - Remove .vercelignore (if exists)
#    - Remove vercel.json (if exists)

# 4. Commit cleanup
git add .
git commit -m "chore: remove Vercel config after Cloudflare Pages migration"
git push origin master
```

---

## 📊 Timeline

```
2026-07-14 (Day 1) — Setup & Staging
├─ 10:00-10:15  Upgrade Cloudflare to Pro
├─ 10:15-10:45  Configure Next.js + wrangler.toml
├─ 10:45-11:00  Setup environment variables
├─ 11:00-11:30  Deploy to staging (web.reportar.app)
├─ 11:30-12:00  Validation tests
└─ 12:00-12:30  Buffer/troubleshooting

2026-07-14 (Day 1) — Demo
├─ 14:00-14:15  Deploy to demo.reportar.app
├─ 14:15-14:45  Validation tests
└─ 14:45-15:00  Document results

2026-07-15 (Day 2) — Monitoring
├─ All day      Monitor staging + demo
└─ 17:00        Decision: Ready for production?

2026-07-16 (Day 3) — Production
├─ 09:00-09:30  Final pre-flight checks
├─ 09:30-10:00  Deploy to production (live.reportar.app)
├─ 10:00-12:00  Intense monitoring (every 5 min)
├─ 12:00-14:00  Moderate monitoring (every 15 min)
└─ 14:00-17:00  Light monitoring (every 30 min)

2026-07-17 (Day 4) — Continuous Monitoring
└─ All day      Monitor + collect metrics

2026-07-17 (Evening) — Cleanup
└─ 17:00-18:00  Delete Vercel if stable
```

---

## 🔄 Rollback Plan

If anything goes wrong, rollback is quick:

### Scenario 1: Staging has issues
```
Action:
1. Re-deploy from Vercel (keep as backup)
2. Delete Cloudflare Pages deployment
3. Keep Vercel live while fixing
4. Retry when ready
```

### Scenario 2: Production has issues (within 24h)
```
Action:
1. Change DNS back to Vercel (if still active)
   OR
2. Disable Cloudflare Pages, enable Vercel nameservers
3. Investigate issue
4. Retry migration after fix

Estimated time: 5-10 minutes
Data loss: 0 (DNS reversal only)
```

### Scenario 3: Production issues (after 24h)
```
Action:
1. Gradual rollback using Cloudflare traffic rules
   - Route 50% to Vercel, 50% to Cloudflare Pages
   - Monitor errors
   - Gradually shift if needed
2. OR: Full rollback (5-10 min)
```

---

## ✅ Success Criteria

### Phase 1 (Staging)
```
✅ web.reportar.app loads in <2 seconds
✅ Supabase connection works
✅ No console errors
✅ Cloudflare cache working (cf-cache-status headers visible)
✅ All CRUD operations work
```

### Phase 2 (Demo)
```
✅ demo.reportar.app loads in <2 seconds
✅ Same tests as Phase 1 pass
✅ Team tested (if applicable)
✅ No performance regressions
```

### Phase 3 (Production)
```
✅ live.reportar.app loads in <2 seconds
✅ 0 customer complaints (first 48h)
✅ Error rate <0.5%
✅ Latency improvement >40% (vs Vercel baseline)
✅ Cache hit ratio >70%
✅ All features work (login, data fetch, etc.)
```

---

## 📈 Expected Improvements

### Latency (Latinamerica)
```
Before (Vercel):    180-260ms
After (Cloudflare): 50-90ms
Improvement:        65-70% ↓
```

### Cache Hit Ratio
```
Before: ~60%
After:  ~85%+
```

### Bandwidth
```
Before: ~2TB/month
After:  ~800GB-1.2TB/month
Savings: 40-60% ↓
```

### Cost
```
Before (Vercel): $20/mo
After (CF Pro): $20/mo
Net change: $0 (SAME COST, better performance!)
```

---

## 📚 Reference Documents

### Configuration Files to Update
- [ ] `next.config.ts` — Add Cloudflare settings
- [ ] `wrangler.toml` — Add (new file)
- [ ] `.env.local` — Verify Supabase vars
- [ ] `package.json` — Verify wrangler script

### Testing Checklist
- [ ] Performance test (DevTools)
- [ ] Functionality test (login, CRUD)
- [ ] Error monitoring (Sentry)
- [ ] Cloudflare analytics

### Cleanup Checklist
- [ ] Delete Vercel project
- [ ] Cancel Vercel Pro subscription
- [ ] Remove Vercel config files (if any)
- [ ] Document migration results

---

## 🚨 Important Notes

1. **Keep Vercel as backup** (at least 48h)
   - Don't delete immediately after migration
   - Wait for stability confirmation

2. **Test staging thoroughly**
   - 99% of issues surface in staging
   - Better to find problems here than production

3. **Monitor actively**
   - First 2 hours are critical
   - Have dashboards open: Sentry, Cloudflare, Vercel

4. **Communicate with team**
   - Brief them on timeline
   - Explain rollback plan
   - Get buy-in before starting

5. **Document everything**
   - Metrics before/after
   - Issues encountered
   - Resolutions applied
   - Lessons learned

---

## ❓ Common Issues & Solutions

### Issue: "Cloudflare shows 502 Bad Gateway"
```
Cause: Origin (Vercel) not reachable
Solution:
1. Verify Vercel deployment is live
2. Check Cloudflare origin settings
3. Verify DNS propagation
4. Rollback if needed
```

### Issue: "Supabase connection fails"
```
Cause: Environment variables not set
Solution:
1. Verify .env.local has SUPABASE_* keys
2. Rebuild Next.js: npm run build
3. Redeploy: wrangler pages deploy
```

### Issue: "Cache is serving stale data"
```
Cause: Cache TTL too long or cache invalidation needed
Solution:
1. Purge Cloudflare cache: https://dash.cloudflare.com
2. Reduce cache TTL in wrangler.toml
3. Redeploy
```

### Issue: "Performance is worse than Vercel"
```
Cause: Cloudflare cache not working or origin is slow
Solution:
1. Check Cloudflare cache hit ratio
2. Check origin response times (Vercel logs)
3. Verify cache headers in next.config.ts
4. Adjust cache rules
```

---

## 📞 Contact & Support

If issues occur:

1. **Check Cloudflare status:** https://www.cloudflarestatus.com
2. **Check Vercel status:** https://www.vercelstatus.com
3. **Sentry errors:** https://sentry.io/reportaweb3
4. **Cloudflare docs:** https://developers.cloudflare.com

---

**Status:** READY FOR EXECUTION  
**Owner:** [Your Name]  
**Last Updated:** 2026-07-14  
**Approval:** [Awaiting confirmation to begin]
