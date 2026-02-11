# GridSpike
Roulette for Stocks

## 🚀 Quick Deploy to Railway

### Prerequisites
- [Railway account](https://railway.app) (free tier available)
- Railway CLI: `npm i -g @railway/cli`

### Deploy in 5 Minutes

1. **Login to Railway**
   ```bash
   railway login
   ```

2. **Initialize Project**
   ```bash
   railway init
   ```

3. **Add Required Services**
   ```bash
   railway add --database postgresql
   railway add --service redis
   ```

4. **Set Environment Variables**
   ```bash
   railway variables set JWT_SECRET="your-secret-key"
   railway variables set JWT_REFRESH_SECRET="your-refresh-secret"
   railway variables set CORS_ORIGIN="https://yourusername.github.io"
   ```

5. **Deploy**
   ```bash
   railway up
   ```

6. **Run Migrations**
   ```bash
   railway run pnpm db:migrate:deploy
   ```

7. **Get Your Server URL**
   ```bash
   railway domain
   ```

**📖 Detailed Guide:** See [RAILWAY_SETUP.md](./RAILWAY_SETUP.md) for comprehensive instructions.

**📋 Full Deployment Options:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for all deployment platforms.

## 📦 Project Structure

```
GridSpike/
├── apps/
│   ├── client/          # React + Vite frontend
│   └── server/          # NestJS backend
├── packages/
│   └── shared/          # Shared types and constants
└── railway.json         # Railway deployment config
```

## 🛠️ Local Development

```bash
# Install dependencies
pnpm install

# Start PostgreSQL and Redis
docker-compose up -d

# Run migrations
pnpm db:migrate

# Start development servers
pnpm dev
```

## 🌐 Environment Variables

### Server
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - Refresh token secret
- `CORS_ORIGIN` - Allowed client origin
- `PORT` - Server port (default: 4000)

### Client
- `VITE_API_URL` - Backend API URL
- `VITE_WS_URL` - WebSocket server URL
