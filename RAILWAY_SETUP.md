# Railway Deployment Checklist

## Prerequisites
- [ ] Railway account created at [railway.app](https://railway.app)
- [ ] Railway CLI installed: `npm i -g @railway/cli`
- [ ] GitHub repository set up (for auto-deployments)

## Initial Setup

### 1. Authentication
```bash
railway login
```

### 2. Create Project
```bash
railway init
# Follow the prompts to create a new project
```

### 3. Add Services

#### PostgreSQL Database
```bash
railway add --database postgresql
# This automatically sets DATABASE_URL
```

#### Redis
```bash
railway add --service redis
# This automatically sets REDIS_URL
```

### 4. Environment Variables

Set these in Railway dashboard or via CLI:

```bash
railway variables set JWT_SECRET="your-secure-jwt-secret-here"
railway variables set JWT_REFRESH_SECRET="your-secure-refresh-secret-here"
railway variables set CORS_ORIGIN="https://yourusername.github.io"
railway variables set NODE_ENV="production"
```

**Auto-provided by Railway:**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `PORT` - Server port (Railway sets automatically)

## Deployment

### Option A: Manual Deploy
```bash
# Deploy from local
railway up
```

### Option B: GitHub Integration (Recommended)
1. Go to Railway dashboard
2. Select your project
3. Settings → Connect GitHub repository
4. Enable automatic deployments
5. Push to main branch to deploy

## Post-Deployment

### 1. Run Database Migrations
```bash
railway run pnpm db:migrate:deploy
```

### 2. Generate Public Domain
```bash
railway domain
# Note the URL: https://your-app.up.railway.app
```

### 3. Update Client Configuration
Update GitHub Actions secrets or .env:
- `VITE_API_URL=https://your-app.up.railway.app`
- `VITE_WS_URL=https://your-app.up.railway.app`

### 4. Verify Deployment
```bash
# Check logs
railway logs --tail 100

# Check status
railway status

# Open dashboard
railway open
```

## Testing

Test your deployed API:
```bash
curl https://your-app.up.railway.app/health
```

Test WebSocket connection from your client app.

## Monitoring

### View Live Logs
```bash
railway logs --follow
```

### Check Metrics
- CPU usage
- Memory usage
- Network traffic
- Database connections

All available in Railway dashboard.

## Troubleshooting

### Build Fails
- Check build logs: `railway logs`
- Verify `railway.json` configuration
- Ensure all dependencies in package.json

### Database Connection Issues
- Verify `DATABASE_URL` is set: `railway variables`
- Check PostgreSQL service is running
- Run migrations: `railway run pnpm db:migrate:deploy`

### Redis Connection Issues  
- Verify `REDIS_URL` is set
- Check Redis service is running

### CORS Errors
- Update `CORS_ORIGIN` to match your client URL
- Include protocol: `https://` not just domain

### Port Issues
- Railway automatically sets `PORT` env variable
- Server listens on `0.0.0.0` (already configured in main.ts)

## Rollback

If deployment fails:
```bash
# From Railway dashboard
Project → Deployments → Select previous successful deployment → Redeploy
```

## Cost Optimization

Railway offers:
- $5 free credit per month
- Pay-as-you-go after free tier
- Starter plan: PostgreSQL, Redis included

Monitor usage in dashboard to stay within budget.

## Useful Commands

```bash
# View all variables
railway variables

# Set a variable
railway variables set KEY=value

# Delete a variable
railway variables delete KEY

# Open dashboard
railway open

# View service status
railway status

# Restart service
railway service restart

# View project info
railway project info
```

## Next Steps

1. Set up monitoring/alerting
2. Configure custom domain (optional)
3. Set up staging environment
4. Enable automatic deployments from GitHub
5. Configure database backups

## Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [NestJS Deployment Guide](https://docs.nestjs.com/faq/deployment)
