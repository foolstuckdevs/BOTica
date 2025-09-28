# BOTica Production Checklist for botica.site

## 🔐 Authentication & Security (CRITICAL - Do First)

### Environment Variables to Update in Vercel:

```bash
# NextAuth
NEXTAUTH_URL=https://botica.site
NEXTAUTH_SECRET=your-production-secret-key (generate new one for production)

# Database (already set but verify)
DATABASE_URL=your-supabase-connection-string
```

### How to update in Vercel:

1. Go to your Vercel project dashboard
2. Settings → Environment Variables
3. Update NEXTAUTH_URL to `https://botica.site`
4. Generate a new NEXTAUTH_SECRET for production (use: `openssl rand -base64 32`)

## 🎨 Favicon & Branding (Quick Wins)

### Add Favicon & App Icons:

- [ ] favicon.ico (16x16, 32x32)
- [ ] icon.png (any size, Next.js will optimize)
- [ ] Open Graph image for social sharing

### Update Metadata:

- [ ] Better title and description
- [ ] Open Graph tags
- [ ] Twitter Card tags
- [ ] Canonical URLs

## 🚀 Performance & SEO

### Immediate:

- [ ] Add robots.txt
- [ ] Add sitemap.xml
- [ ] Update metadata with proper descriptions
- [ ] Add structured data (JSON-LD)

### Optional:

- [ ] Google Analytics
- [ ] Google Search Console
- [ ] Error monitoring (Sentry)

## 📱 PWA Features (Nice to Have)

- [ ] Add manifest.json for "Add to Home Screen"
- [ ] Service worker for offline functionality
- [ ] Push notifications

## 🔒 Security Headers

- [ ] Content Security Policy
- [ ] Security headers in next.config.ts

## 📊 Monitoring

- [ ] Uptime monitoring
- [ ] Performance monitoring
- [ ] Error tracking

---

## Priority Order:

1. **CRITICAL**: Update NEXTAUTH_URL and NEXTAUTH_SECRET
2. **HIGH**: Add favicon and basic metadata
3. **MEDIUM**: SEO optimizations
4. **LOW**: Advanced features
