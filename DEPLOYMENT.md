# Deployment Guide

## Client Deployment (GitHub Pages)

### Setup Steps

1. **Enable GitHub Pages**
   - Go to your repo: Settings → Pages
   - Source: "GitHub Actions"

2. **Add Secrets**
   - Go to: Settings → Secrets and variables → Actions
   - Add repository secrets:
     - `VITE_API_URL`: Your production server URL (e.g., `https://api.gridspike.com`)
     - `VITE_WS_URL`: Your WebSocket server URL (same as API URL)

3. **Deploy**
   ```bash
   git add .
   git commit -m "Setup GitHub Pages deployment"
   git push origin main
   ```

4. **Access Your Site**
   - URL: `https://yourusername.github.io/GridSpike/`
   - Or use a custom domain in Settings

### Manual Build (Optional)
```bash
cd apps/client
GITHUB_PAGES=true VITE_API_URL=https://your-api.com pnpm build
```

---

## Server Deployment Options

GitHub Pages **cannot** host the server. Choose one:

### Option 1: Railway (Recommended - Easy)
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and init
railway login
railway init

# Deploy
railway up

# Add environment variables in Railway dashboard
```

### Option 2: Render
1. Create account at [render.com](https://render.com)
2. New → Web Service
3. Connect GitHub repo
4. Settings:
   - Build Command: `pnpm install && pnpm --filter=@gridspike/server build`
   - Start Command: `cd apps/server && node dist/main`
   - Add environment variables from `.env`

### Option 3: Heroku
```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create gridspike-server

# Add PostgreSQL and Redis
heroku addons:create heroku-postgresql:mini
heroku addons:create heroku-redis:mini

# Set environment variables
heroku config:set JWT_SECRET=your-secret

# Deploy
git push heroku main
```

### Option 4: DigitalOcean/AWS/Azure
- Set up a VPS or App Platform
- Install Node.js, PostgreSQL, Redis
- Use PM2 or systemd for process management
- Configure nginx as reverse proxy
- Set up SSL with Let's Encrypt

### Option 5: Fly.io
```bash
# Install flyctl
curl -L https://fly.io/install.sh | sh

# Login and launch
fly auth login
fly launch

# Configure fly.toml as needed
fly deploy
```

---

## Post-Deployment Checklist

### Server
- ✅ Environment variables configured
- ✅ Database URL correct
- ✅ Redis connected
- ✅ CORS origin set to GitHub Pages URL
- ✅ JWT secrets are strong and secure
- ✅ Prisma migrations run: `prisma db push` or `prisma migrate deploy`

### Client
- ✅ GitHub Pages enabled
- ✅ Secrets added (VITE_API_URL, VITE_WS_URL)
- ✅ API URL points to production server
- ✅ Build successful in Actions tab

### Testing
```bash
# Test server
curl https://your-api-url.com

# Test client
# Visit your GitHub Pages URL and check browser console
```

---

## Architecture

```
┌─────────────────────────────────┐
│   GitHub Pages (Static Site)   │
│  https://user.github.io/repo/   │
│         (React Client)          │
└────────────┬────────────────────┘
             │
             │ HTTPS
             │
             ▼
┌─────────────────────────────────┐
│   Railway/Render/Heroku/VPS    │
│   https://api.gridspike.com     │
│       (NestJS Server)           │
└────────────┬────────────────────┘
             │
             ├── PostgreSQL DB
             └── Redis Cache
```

---

## Custom Domain (Optional)

### For GitHub Pages:
1. Buy domain from Namecheap/Cloudflare
2. Add CNAME record pointing to `yourusername.github.io`
3. In repo: Settings → Pages → Custom domain
4. Update `base: '/'` in `vite.config.ts`

### For Server:
- Configure domain in your hosting provider
- Set up SSL certificate
- Update CORS_ORIGIN in server .env
