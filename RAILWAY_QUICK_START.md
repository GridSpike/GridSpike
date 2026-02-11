# Railway Deployment - Quick Reference

## 📁 Configuration Files Created

| File | Purpose |
|------|---------|
| `railway.json` | Railway build and deploy configuration |
| `railway.toml` | Alternative Railway config format |
| `nixpacks.toml` | Build system configuration |
| `Procfile` | Process definition for Railway |
| `.railwayignore` | Files to exclude from deployment |
| `railway-migrate.sh` | Database migration script |
| `railway.env.template` | Environment variables reference |
| `.github/workflows/railway-deploy.yml` | GitHub Actions deployment workflow |

## 🚀 Deployment Steps

### Option 1: Railway CLI (Recommended for First Deploy)

```bash
# 1. Install and login
npm i -g @railway/cli
railway login

# 2. Create project and add services
railway init
railway add --database postgresql
railway add --service redis

# 3. Set environment variables (REQUIRED)
railway variables set JWT_SECRET="$(openssl rand -base64 32)"
railway variables set JWT_REFRESH_SECRET="$(openssl rand -base64 32)"
railway variables set CORS_ORIGIN="https://yourusername.github.io"

# 4. Deploy
railway up

# 5. Run migrations
railway run pnpm db:migrate:deploy

# 6. Get your URL
railway domain
```

### Option 2: GitHub Integration (Recommended for Continuous Deployment)

1. **Initial Setup on Railway:**
   - Go to [railway.app](https://railway.app)
   - Create new project
   - Connect your GitHub repository
   - Add PostgreSQL database
   - Add Redis service

2. **Set Environment Variables in Railway Dashboard:**
   - Go to project → Variables tab
   - Add variables from `railway.env.template`

3. **Enable GitHub Actions (Optional):**
   - Add GitHub secrets:
     - `RAILWAY_TOKEN` (get from Railway dashboard)
     - `RAILWAY_SERVICE_ID` (get from Railway dashboard)
   - Push to main branch triggers deployment

4. **Automatic Deployments:**
   - Simply push to GitHub main branch
   - Railway automatically builds and deploys
   - No CLI needed after initial setup

## 🔑 Required Environment Variables

```bash
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"
CORS_ORIGIN="https://your-client-url.com"
```

**Auto-provided by Railway:**
- `DATABASE_URL`
- `REDIS_URL`
- `PORT`

## 📋 Post-Deployment Checklist

- [ ] Server deployed successfully
- [ ] PostgreSQL connected
- [ ] Redis connected
- [ ] Database migrations run
- [ ] Public domain generated
- [ ] Environment variables set
- [ ] CORS configured correctly
- [ ] Client updated with server URL
- [ ] Health check endpoint working
- [ ] WebSocket connections working

## 🧪 Testing Deployment

```bash
# Health check
curl https://your-app.up.railway.app/health

# Or test from client
# Update VITE_API_URL and VITE_WS_URL in client/.env.production
```

## 📊 Monitoring

```bash
# View logs
railway logs --tail 100

# Follow logs in real-time
railway logs --follow

# Check status
railway status

# Open dashboard
railway open
```

## 🔧 Troubleshooting

### Build fails
```bash
# Check logs
railway logs

# Verify build command in railway.json
# Ensure dependencies are in package.json
```

### Database connection fails
```bash
# Verify DATABASE_URL is set
railway variables | grep DATABASE_URL

# Check PostgreSQL service status in dashboard

# Re-run migrations
railway run pnpm db:migrate:deploy
```

### CORS errors
```bash
# Update CORS_ORIGIN to match your client URL
railway variables set CORS_ORIGIN="https://your-actual-client-url.com"

# Restart service
railway service restart
```

## 💰 Cost Estimation

Railway offers:
- **Hobby Plan:** $5/month (includes $5 credit)
- **Pay-as-you-go:** After credit exhausted
- **Included:** PostgreSQL, Redis, 500 MB RAM, 1 GB disk

Typical monthly cost for this app: **$5-10**

## 📚 Additional Resources

- **Detailed Setup:** See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md)
- **All Deployment Options:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Railway Docs:** https://docs.railway.app
- **Railway Discord:** https://discord.gg/railway

## 🎯 Next Steps

1. **Set up monitoring:** Add health checks and alerts
2. **Configure custom domain:** (Optional) Add your own domain
3. **Set up staging environment:** Create separate Railway project
4. **Enable database backups:** Configure in Railway dashboard
5. **Set up CI/CD:** Use GitHub Actions workflow provided

## 🆘 Need Help?

- Check [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for detailed instructions
- View Railway logs: `railway logs`
- Join Railway Discord for community support
- Check Railway status page for outages

---

**Quick Command Reference:**
```bash
railway login              # Login to Railway
railway init              # Create new project
railway link              # Link existing project
railway up                # Deploy
railway logs              # View logs
railway variables         # List variables
railway domain            # Generate public domain
railway open              # Open dashboard
railway status            # Check status
```
