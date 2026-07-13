# 🔍 Cloudflare Audit: reportar.app (Landing Estática)

**Date:** 2026-07-13  
**Owner:** Infrastructure Lead  
**Domain:** reportar.app (marketing landing - static)  
**Cloudflare Config Name:** reportar-landing  
**Status:** Currently in Cloudflare (audit needed)

---

## 📋 Pre-Audit Checklist

**Before proceeding, get this info from Cloudflare dashboard:**

```
[ ] SSL/TLS Mode: Flexible / Full / Full Strict?
[ ] Cache Rule Level: By Path or Global?
[ ] Browser Cache TTL: Set or Auto?
[ ] Minification: Enabled (JS/CSS/HTML)?
[ ] Compression: Enabled (Brotli/Gzip)?
[ ] Image Optimization: Enabled?
[ ] Security Headers: X-Frame-Options, HSTS, CSP?
[ ] Rate Limiting: Any rules active?
[ ] Firewall Rules: Any active?
[ ] Page Rules: (deprecated, but check if any exist)
[ ] Workers: Any deployed?
[ ] Analytics: Access logs enabled?
```

---

## ✅ Best Practices for Static Landing Page

Since reportar.app is **100% static**, here's the optimal Cloudflare config:

### 1️⃣ SSL/TLS Configuration

**Current:** ❓ (need to verify)

**Recommended:** Full (Strict)
```
User → HTTPS ↔️ Cloudflare → HTTPS ↔️ Origin
                ✓ End-to-end encryption
                ✓ Most secure option
```

**Action:** 
```
SSL/TLS → Overview
Mode: Full (Strict)
Certificate: Auto (Cloudflare managed)
```

---

### 2️⃣ Cache Configuration (CRITICAL for Static Sites)

**Current:** ❓ (need to verify)

**Recommended Setup:**

#### Cache Rule 1: Static Assets (Images, CSS, JS, Fonts)
```
Criteria: URI Path matches /assets/* OR /static/* OR /images/*
         OR ends with .css OR .js OR .woff2 OR .png OR .jpg

Action: Cache
TTL: 31536000 (1 year)
Browser Cache TTL: 31536000 (1 year)
Cache Key: Include query string
Reason: These don't change often, cache aggressively
```

**Result:** First user waits 2s, next 10,000 users get instant load (cached globally)

---

#### Cache Rule 2: HTML Pages
```
Criteria: URI Path matches /* (everything else)

Action: Cache
TTL: 3600 (1 hour)
Browser Cache TTL: 300 (5 minutes)
Cache-Control: public, max-age=300, stale-while-revalidate=86400

Reason: HTML changes sometimes (new deployment), 
        but cache for 1h at edge + serve stale while revalidating
```

**Result:** New version deployed → old cached version served for 1h, but background refresh pulls new version

---

#### Cache Rule 3: API/Form Endpoints (if any)
```
Criteria: URI Path matches /api/* OR /contact OR /newsletter

Action: Bypass Cache

Reason: Form submissions must not be cached
```

---

### 3️⃣ Performance Optimizations (Auto-enable these)

**Current:** ❓

**Recommended:**

#### Compression
```
Speed → Compression: Brotli
Auto-enable: Gzip (fallback)
Minify: CSS, JavaScript, HTML
Result: 40-60% size reduction on HTML/CSS/JS
```

#### Image Optimization
```
Images → Polish: Lossless
Polish: WebP Conversion: On
Polish: Resize images: Enabled
Result: Automatic format conversion + size reduction
```

#### Rocket Loader (optional, be careful)
```
Speed → Rocket Loader: TESTING mode
(Defers JS loading — can break some sites)
Recommendation: Disable unless performance need
```

---

### 4️⃣ Security Configuration

**Current:** ❓

**Recommended:**

#### Security Headers (add these via Page Rules or Headers)
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

Reason: Prevent clickjacking, MIME sniffing, XSS, etc.
```

#### Content Security Policy (if applicable)
```
CSP: default-src 'self'; 
     script-src 'self' 'unsafe-inline' https://analytics.google.com; 
     style-src 'self' 'unsafe-inline'; 
     img-src 'self' data: https:;

Reason: Only allow trusted scripts/styles from known origins
```

---

### 5️⃣ Rate Limiting

**Current:** ❓

**Recommended:** Basic rate limiting for form submissions
```
Criteria: URI Path matches /contact OR /newsletter OR /api/*
Action: Rate limit to 10 requests per 10 seconds per IP
Reason: Prevent spam form submissions
```

---

### 6️⃣ Firewall Rules

**Current:** ❓

**Recommended: Optional Basic Rules**

```
Rule 1: Block known bot patterns
  Condition: cf.bot_management.score < 30
  Action: BLOCK
  Reason: Challenge obvious bots

Rule 2: Geographic restriction (optional)
  Condition: Country NOT IN (CO, EC, PE, US, ...) 
  Action: ALLOW (just log for now)
  Reason: Optional — can restrict to Latam + US if needed

Rule 3: Challenge on suspicious patterns
  Condition: (cf.threat_score > 50) OR (cf.bot_management.score < 50)
  Action: CHALLENGE
  Reason: Show CAPTCHA to suspicious traffic
```

---

### 7️⃣ Page Rules (deprecated, but if existing)

**Current:** ❓

**Recommended:** Migrate to Cache Rules (they replaced Page Rules)
```
If Page Rules exist:
  1. Note down all rules
  2. Recreate them as Cache Rules
  3. Delete old Page Rules

Page Rules are deprecated and will be removed by Cloudflare soon.
```

---

### 8️⃣ Analytics & Monitoring

**Current:** ❓

**Recommended: Enable These**

```
Analytics:
  ✓ Web Analytics (free, shows traffic patterns)
  ✓ GraphQL Analytics API (for custom dashboards)
  ✓ Logpush (log all requests for compliance)

Monitoring:
  ✓ Page Load Time alerts
  ✓ Error Rate alerts
  ✓ Security Event alerts

Origin Status:
  ✓ Health Checks: Check origin every 30 seconds
  ✓ Failover: (not applicable for static sites, but good to have)
```

---

### 9️⃣ Workers & Advanced Features

**Current:** ❓

**Recommended for Static Landing:** Optional (not critical)

```
Workers uses (if desired):
  - Redirect old URLs to new ones (301 redirects)
  - Add analytics tracking headers
  - A/B testing (serve different versions to different users)
  - Customize cache behavior based on cookies

Example: If landing page is SEO-heavy
  → Use Worker to add Open Graph tags dynamically based on URL
  → Improves social media sharing

For now: Not needed, skip unless specific need
```

---

## 🎯 Improvement Proposal for reportar.app

### Priority 1: MUST DO (Security + Performance)
- [ ] Verify SSL/TLS is Full (Strict) — NOT Flexible
- [ ] Cache rules configured for static assets (1 year) + HTML (1 hour)
- [ ] Compression enabled (Brotli + minification)
- [ ] Security headers in place (HSTS, CSP, X-Frame-Options)
- [ ] Rate limiting on forms

**Expected Impact:** 
- Security: Enterprise-grade ✓
- Performance: 40-60% faster (compression + caching) ✓
- User trust: Higher (security headers visible to browsers) ✓

---

### Priority 2: SHOULD DO (Observability)
- [ ] Web Analytics enabled
- [ ] Logpush configured (optional, for compliance)
- [ ] Page load time alerts
- [ ] Error rate alerts

**Expected Impact:**
- Visibility: Know what's happening on your landing page ✓
- Alerts: Get notified of issues before users report them ✓

---

### Priority 3: NICE TO HAVE (Advanced)
- [ ] Image Optimization enabled
- [ ] Bot Management (if DDoS risk)
- [ ] Firewall Rules for geo-blocking (if needed)
- [ ] Workers for custom logic (A/B testing, redirects)

**Expected Impact:**
- Performance: 10-20% faster images ✓
- Control: Fine-grained traffic management ✓

---

## 📊 Configuration Checklist (To Verify)

**SSH into Cloudflare dashboard and check:**

```
□ Overview Tab:
  □ Domain: reportar.app ✓
  □ Status: Active (orange cloud icon)
  □ Nameservers: Cloudflare managed ✓
  
□ SSL/TLS Tab:
  □ Mode: Full (Strict) [verify this]
  □ Certificate: Active ✓
  □ HSTS: Enabled ✓
  
□ Caching Tab:
  □ Cache Rules: [verify these exist]
    □ Static assets: cache 1 year
    □ HTML: cache 1 hour
    □ API/forms: bypass cache
  □ Browser Cache TTL: Set appropriately
  □ Minification: CSS, JS, HTML ✓
  
□ Speed Tab:
  □ Compression: Brotli ✓
  □ Image Optimization: Enabled ✓
  □ Rocket Loader: Disabled (unless needed) ✓
  
□ Security Tab:
  □ Security Level: High ✓
  □ Challenge Passage: 30 minutes ✓
  □ Bot Fight Mode: Enabled ✓
  
□ Rules Tab:
  □ Firewall Rules: [if any exist, verify]
  □ Cache Rules: [verify the 3 rules above]
  □ Page Rules: [should be deprecated/empty]
  
□ Analytics Tab:
  □ Web Analytics: Enabled ✓
  □ Logpush: [optional, check if enabled]
```

---

## 🔧 Actions Required

### Action 1: Document Current Config
```
Time: 15 minutes
Owner: Devops
Action: Screenshot/document current state
Deliverable: CLOUDFLARE_LANDING_CURRENT_STATE.md
```

### Action 2: Implement Improvements
```
Time: 30 minutes
Owner: Devops
Actions:
  1. Update SSL/TLS to Full (Strict) if not already
  2. Create/verify cache rules (3 rules above)
  3. Enable compression + minification
  4. Add security headers
  5. Enable rate limiting on forms
Deliverable: All settings applied
```

### Action 3: Validate
```
Time: 15 minutes
Owner: QA
Actions:
  1. Load https://reportar.app in browser
  2. Verify cache headers (cf-cache-status: HIT/MISS)
  3. Check security headers present
  4. Test form submission (should work, not cached)
  5. Verify performance (should be fast)
Deliverable: Validation report
```

---

## 📈 Expected Improvements After Config

### Performance
```
Before:        After:
TTFB: 200ms → 50ms (3x faster, via CDN edge)
Full load: 3s → 1s (3x faster, via compression + caching)
Cache hit: ?% → 95%+ (all static cached)
```

### Security
```
Before: Basic      → After: Enterprise-grade
  SSL: Flexible   →   Full (Strict)
  WAF: Off        →   On (Bot Management)
  Headers: None   →   All security headers
```

### Cost
```
Before: Native Cloudflare cost ~$20/mo
After:  Same $20/mo (no additional cost)
Benefit: Same price, 3x better performance + security
```

---

## 🎯 Next Steps

1. **Document Current State** (15 min)
   - Get screenshot of reportar-landing config
   - Note what's already set up

2. **Implement Improvements** (30 min)
   - Apply recommendations above
   - Test everything works

3. **Proceed to demo.reportar.app** (next subtask)
   - Apply same config pattern
   - But also add specific caching for dynamic content

4. **Then live.reportar.app** (final subtask)
   - Same config as demo
   - With production monitoring enabled

---

**Status:** Audit template ready  
**Next:** Obtain current configuration screenshot + implement improvements
