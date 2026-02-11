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

**Prerequisites:**
- Railway account ([railway.app](https://railway.app))
- Railway CLI installed

**Step 1: Install Railway CLI**
```bash
npm i -g @railway/cli
```

**Step 2: Login to Railway**
```bash
railway login
```

**Step 3: Create a New Project**
```bash
# Initialize Railway project in your repo
railway init

# This will create a new project on Railway
```

**Step 4: Add PostgreSQL Database**
```bash
# Add PostgreSQL to your project
railway add --database postgresql
```

**Step 5: Add Redis**
```bash
# Add Redis to your project
railway add --service redis
```

**Step 6: Set Environment Variables**

Go to your Railway dashboard or use CLI:

```bash
# Set environment variables
railway variables set JWT_SECRET="your-super-secret-jwt-key-change-in-production"
railway variables set JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
railway variables set CORS_ORIGIN="https://yourusername.github.io"
railway variables set PORT=4000
```

**Important:** Railway automatically provides:
- `DATABASE_URL` (from PostgreSQL service)
- `REDIS_URL` (from Redis service)

**Step 7: Deploy**
```bash
# Deploy the server to Railway
railway up

# Or link to GitHub for automatic deployments
railway link
```

**Step 8: Run Database Migrations**
```bash
# After first deploy, run migrations
railway run pnpm db:migrate
```

**Step 9: Get Your Server URL**
```bash
# Generate a public domain
railway domain

# Your server will be available at: https://your-app.up.railway.app
```

**Step 10: Update Client Environment Variables**

Use your Railway server URL in the client deployment:
- `VITE_API_URL`: `https://your-app.up.railway.app`
- `VITE_WS_URL`: `https://your-app.up.railway.app`

**Configuration Files:**
- `railway.json` / `railway.toml`: Build and deploy configuration
- `nixpacks.toml`: Build system configuration

**Automatic Deployments (Recommended):**
1. Go to Railway dashboard → Your Project → Settings
2. Connect your GitHub repository
3. Enable automatic deployments on push to main branch
4. Railway will automatically deploy when you push changes

**Monitoring:**
- View logs: `railway logs`
- Check status: `railway status`
- Open dashboard: `railway open`

**Troubleshooting:**
- If migrations fail, run: `railway run pnpm --filter=@gridspike/server prisma migrate deploy`
- Check logs for errors: `railway logs --tail 100`
- Verify environment variables: `railway variables`

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
