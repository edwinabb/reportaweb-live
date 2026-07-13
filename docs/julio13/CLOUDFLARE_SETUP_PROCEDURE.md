# 🔧 Cloudflare Setup Procedure — reporta.app

**Date:** 2026-07-13  
**Owner:** Devops  
**Domain:** reporta.app (PRODUCTION — no clients affected)  
**Timeline:** 30 minutes total

---

## ⚡ IMPORTANT: No Staging Needed

✅ Since NO clients are currently using reporta.app, we can setup Cloudflare directly on production without risk.

```
Old system (in production):
  reporta.la → Supabase (clients here)

New system (in testing):
  reporta.app → Vercel + Supabase (no clients yet)
  
⇒ We can safely configure reporta.app with Cloudflare
```

---

## 📋 Checklist (30 min)

```
□ 5 min  — Step 1: Cloudflare Account Setup
□ 5 min  — Step 2: Create Zone (reporta.app)
□ 5 min  — Step 3: Update Nameservers (in registrador)
□ 3 min  — Step 4: Create CNAME Record
□ 3 min  — Step 5: Enable SSL/TLS
□ 4 min  — Step 6: Create Cache Rules (3 rules)
□ 3 min  — Step 7: Validate Setup
```

---

## 🚀 STEP-BY-STEP EXECUTION

### STEP 1: Cloudflare Account Setup (5 min)

**Goal:** Verify Cloudflare account is ready

**Actions:**
```bash
# 1. Go to: https://dash.cloudflare.com
# 2. Login with company email
# 3. If no account exists:
#    - Sign up at https://dash.cloudflare.com/sign-up
#    - Use Pro plan ($20/month)
# 4. Verify account is active
```

**Expected Result:**
```
✓ Cloudflare dashboard loads
✓ Account shows billing info
✓ No warnings or limits
```

---

### STEP 2: Create Zone for reporta.app (5 min)

**Goal:** Add reporta.app as a new Cloudflare zone

**Actions:**
```
1. In Cloudflare dashboard, click "Add a Site"
2. Enter domain name: reporta.app (NOT staging.reporta.app)
3. Select plan: Pro ($20/month)
4. Cloudflare will scan your DNS records
5. Click "Confirm plan"
6. Cloudflare generates nameservers (SAVE THESE):
   - ns1.cloudflare.com
   - ns2.cloudflare.com
   (Or similar — note the exact ones shown)
```

**Screenshot expected:**
```
┌─────────────────────────────────────────┐
│ Your Cloudflare Nameservers             │
├─────────────────────────────────────────┤
│ ns1.cloudflare.com                      │
│ ns2.cloudflare.com                      │
└─────────────────────────────────────────┘
```

**At this point:**
```
Zone created but NOT yet active
(because registrador still points to old nameservers)
```

---

### STEP 3: Update Nameservers in Registrador (5 min)

**Goal:** Point domain registrador to Cloudflare nameservers

⚠️ **CRITICAL:** This step activates Cloudflare. After this, DNS queries go through Cloudflare.

**Actions:**

Find where reporta.app is registered (usually GoDaddy, NameCheap, Route53, etc):

```
1. Go to your domain registrador dashboard
2. Find "DNS" or "Nameservers" section
3. Look for where nameservers are currently set
4. Current nameservers might be:
   - Vercel nameservers (if using Vercel DNS)
   - Generic registrador nameservers
   - Previous provider

5. Change nameservers to:
   - ns1.cloudflare.com
   - ns2.cloudflare.com
   (Use the exact ones Cloudflare showed in Step 2)

6. Save changes
7. Registrador confirms: "Nameserver change initiated"
```

**Example (GoDaddy):**
```
1. Login to godaddy.com
2. Go to "My Products" → Domains
3. Find reporta.app
4. Click "Manage DNS"
5. Find "Nameservers" section
6. Change to Cloudflare nameservers
7. Save
```

**Example (NameCheap):**
```
1. Login to namecheap.com
2. Go to "Dashboard" → Manage Domain (reporta.app)
3. Find "Nameservers" tab
4. Change to Cloudflare nameservers
5. Save
```

**Propagation Time:**
```
Change made: Now
Full propagation: 5-30 minutes (usually 10 min)
```

**How to verify propagation:**
```bash
# In terminal, run this repeatedly:
nslookup reporta.app

# Before step 3:
# reporta.app
# Name: ns-1.vercel.co
# Address: xxx.xxx.xxx.xxx

# After step 3 (5-10 min later):
# reporta.app
# Name: ns1.cloudflare.com
# Address: yyy.yyy.yyy.yyy
```

---

### STEP 4: Create CNAME Record (3 min)

**Goal:** Tell Cloudflare where to send traffic

**Actions:**

In Cloudflare dashboard:

```
1. Go to: DNS → Records (not "Nameservers", that's different)
2. Click "Add record"
3. Fill in:
   - Type: CNAME
   - Name: @ (this means root domain = reporta.app)
   - Target: vercel-edge.net (this is Vercel's edge server)
   - Proxy status: Proxied (orange cloud — this enables CDN)
   - TTL: Auto
4. Click "Save"
```

**What this does:**
```
Before CNAME:
  reporta.app → (old nameserver config)

After CNAME:
  reporta.app → Cloudflare nameserver
               → Cloudflare checks CNAME record
               → Finds: vercel-edge.net
               → Routes traffic to Vercel
```

**Expected Result in Dashboard:**
```
Type    Name    Content              Proxy
CNAME   @       vercel-edge.net      Proxied (orange ☁️)
```

---

### STEP 5: Enable SSL/TLS (3 min)

**Goal:** Ensure HTTPS encryption end-to-end

**Actions:**

In Cloudflare dashboard:

```
1. Go to: SSL/TLS → Overview
2. Find "Encryption mode" section
3. Current setting: might be "Flexible" or "Full"
4. Change to: Full (Strict)
   (This ensures HTTPS all the way: User ↔️ Cloudflare ↔️ Vercel)
5. Save
```

**What each mode means:**
```
Flexible:     User → HTTPS ↔️ Cloudflare → HTTP ↔️ Vercel ❌
Full:         User → HTTPS ↔️ Cloudflare → HTTPS ↔️ Vercel ✅
Full (Strict): Same as Full, but verify cert validity ✅✅
```

**Choose:** Full (Strict)

**Expected Result:**
```
SSL/TLS status: Active
Encryption mode: Full (Strict)
Certificate: Valid (auto-managed by Cloudflare)
```

---

### STEP 6: Create Cache Rules (4 min)

**Goal:** Define what should be cached and for how long

**Actions:**

In Cloudflare dashboard → Caching → Cache Rules

**Create Rule 1: Static Assets**
```
1. Click "Create rule"
2. Fill in:
   - Criteria: if URI Path matches /static/*
   - Action: Cache
   - TTL: 1 year (31536000 seconds)
   - Cache Key: Include query string
3. Save
```

**Create Rule 2: API Endpoints**
```
1. Click "Create rule"
2. Fill in:
   - Criteria: if URI Path matches /api/*
   - Action: Bypass Cache (never cache)
3. Save
```

**Create Rule 3: HTML Pages**
```
1. Click "Create rule"
2. Fill in:
   - Criteria: if URI Path matches /*.html
   - Action: Cache
   - TTL: 1 hour (3600 seconds)
   - Browser cache TTL: 30 minutes
3. Save
```

**Rationale:**
```
Static (/static/*):
  - Doesn't change often
  - Cache 1 year = users get instant load
  - Example: app.js, styles.css, logo.png

API (/api/*):
  - Personalized data (varies by user)
  - Never cache = always fresh data
  - Example: /api/tareas, /api/user/profile

HTML (/*.html):
  - Changes sometimes (new version deployed)
  - Cache 1 hour = users see updates within 1h
  - Example: /planificacion, /reportes
```

**Expected Result:**
```
✓ 3 rules visible in Caching → Cache Rules
✓ Each rule shows status: "Enabled"
```

---

### STEP 7: Validate Setup (3 min)

**Goal:** Confirm Cloudflare is working correctly

**Test 1: DNS Resolution**
```bash
# Run in terminal:
nslookup reporta.app

# Expected output:
# Server: 8.8.8.8 (or your DNS)
# Non-authoritative answer:
# Name: reporta.app
# Address: xxx.xxx.xxx.xxx (Cloudflare IP)
# 
# ✓ If you see Cloudflare IP, DNS is working
```

**Test 2: HTTPS Connection**
```bash
# Run in terminal:
curl -I https://reporta.app

# Expected output:
# HTTP/2 200
# cf-ray: 12345abcde-XXX (Cloudflare header ✓)
# cf-cache-status: HIT or MISS (cache working ✓)
# date: [current date]
# ...
```

**Test 3: Browser Test**
```
1. Open browser
2. Go to: https://reporta.app
3. Wait 5-10 seconds for page to load
4. Open Developer Tools → Network tab
5. Look at response headers:
   - Should see "cf-ray: ..." (Cloudflare routing)
   - Should see "cf-cache-status: HIT" or "MISS" (cache status)
   - Should NOT see errors

4. Refresh page
5. Check cache status:
   - First load: MISS (not cached yet)
   - Second load: HIT (now cached by Cloudflare)
```

**Test 4: Check SSL/TLS**
```
1. In browser, go to: https://reporta.app
2. Click lock icon in URL bar
3. Certificate details should show:
   - Issued by: Cloudflare
   - Valid: Yes
   - Secure: Yes
```

---

## ✅ Success Criteria

**All tests pass if:**

| Test | Expected | Status |
|------|----------|--------|
| DNS resolution | `nslookup` shows Cloudflare IP | [ ] |
| HTTPS | `curl -I` returns HTTP/2 200 | [ ] |
| Cloudflare headers | Response includes `cf-ray` | [ ] |
| Cache working | `cf-cache-status: HIT/MISS` visible | [ ] |
| SSL/TLS | Browser shows "Secure" | [ ] |
| Page loads | https://reporta.app loads in <5s | [ ] |
| No errors | Sentry shows no new errors | [ ] |

---

## 🆘 Troubleshooting

### Problem: DNS not resolving to Cloudflare
```
Symptom: nslookup still shows old nameserver IP
Cause: Propagation delay or registrador update didn't save
Fix:
  1. Wait 10-15 minutes
  2. Check registrador dashboard again — nameservers saved?
  3. Try: nslookup reporta.app ns1.cloudflare.com (force check)
  4. If still fails, re-check registrador settings
```

### Problem: Page returns 502 Bad Gateway
```
Symptom: https://reporta.app shows "Error 502"
Cause: CNAME might be wrong or Vercel origin down
Fix:
  1. Check Vercel status: https://www.vercelstatus.com
  2. In Cloudflare, verify CNAME:
     - Should be: vercel-edge.net
     - NOT: vercel.com or something else
  3. If Vercel is down, wait for recovery
  4. If CNAME is wrong, fix it and save
```

### Problem: Cache not working (all MISS)
```
Symptom: cf-cache-status always shows "MISS"
Cause: Cache rules might not match or bypass active
Fix:
  1. Check cache rules exist (Caching → Cache Rules)
  2. Verify rule criteria matches your paths
  3. Check if "Bypass Cache" is active (should only be for /api/*)
  4. Wait a few minutes, try again (needs time to cache)
```

### Problem: SSL/TLS certificate error
```
Symptom: Browser shows "Certificate error" or "SEC_ERROR_UNKNOWN_ISSUER"
Cause: SSL/TLS mode wrong or cert not issued yet
Fix:
  1. Go to SSL/TLS → Overview
  2. Set to: Full (Strict)
  3. Wait 5 minutes for cert generation
  4. Refresh browser
  5. If still fails, switch to "Full" (non-strict) temporarily
```

---

## 📝 Post-Setup Checklist

After Step 7 (all tests pass):

- [ ] Document Cloudflare account credentials securely
- [ ] Save Cloudflare API token (for automation later)
- [ ] Add Cloudflare dashboard to team bookmarks
- [ ] Brief team on what was changed
- [ ] Monitor Sentry for errors (next 1 hour)
- [ ] Check latency from Sudamérica (next subtask)
- [ ] Move to next Fase 1 subtask (latency testing)

---

## 🎯 Next Steps After This Task

Once Cloudflare setup is ✅ COMPLETE:

1. **Latency Baseline Testing (Subtask 4)** — Measure improvement
2. **Supabase Review (Subtask 5)** — Verify regional setup
3. **Docs Audit (Subtask 6)** — Update documentation
4. **Team Briefing (Subtask 7)** — Align team

All can run in parallel with this task.

---

## 📞 Support

**If you get stuck:**
1. Check troubleshooting section above
2. Document exact error message
3. Check Cloudflare status: https://www.cloudflarestatus.com
4. Check Vercel status: https://www.vercelstatus.com
5. Escalate to Tech Lead if blocker

---

**Status:** Ready to execute  
**Owner:** Devops  
**Estimated Duration:** 30 minutes  
**Expected Completion:** 2026-07-13 afternoon
