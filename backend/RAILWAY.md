# Railway Deployment Guide

## Quick Start

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Create project: `railway init`
4. Add PostgreSQL: `railway add -d postgres`
5. Add Redis: `railway add -d redis`
6. Deploy: `railway up`

## Environment Variables

Set these in Railway dashboard (Settings > Variables):

### Required

```bash
# Server
NODE_ENV=production
PORT=3001

# Database (auto-injected by Railway PostgreSQL plugin)
DATABASE_URL=${{Postgres.DATABASE_URL}}
# OR set individually:
DB_HOST=${{Postgres.PGHOST}}
DB_PORT=${{Postgres.PGPORT}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_SSL=true

# Redis (auto-injected by Railway Redis plugin)
REDIS_URL=${{Redis.REDIS_URL}}

# JWT (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=<generate-secure-secret>
JWT_REFRESH_SECRET=<generate-different-secret>

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=<generate-32-byte-hex>
```

### Production Settings

```bash
# Logging
LOG_LEVEL=info

# CORS (your frontend URL)
ALLOWED_ORIGINS=https://your-frontend.railway.app,https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Optional Services

```bash
# SRSA Integration (use mock for testing)
USE_MOCK_SRSA=true
SRSA_API_URL=https://api.srsa.gov.sa
SRSA_API_KEY=<your-key>
SRSA_API_SECRET=<your-secret>

# Email (SendGrid)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-key>
EMAIL_FROM=noreply@yourdomain.com

# SMS (Twilio)
TWILIO_ACCOUNT_SID=<your-sid>
TWILIO_AUTH_TOKEN=<your-token>
TWILIO_PHONE_NUMBER=<your-number>

# HyperPay Payments
HYPERPAY_ACCESS_TOKEN=<your-token>
HYPERPAY_ENTITY_ID_MADA=<entity-id>
HYPERPAY_ENTITY_ID_VISA=<entity-id>
HYPERPAY_ENTITY_ID_MASTER=<entity-id>
HYPERPAY_WEBHOOK_SECRET=<webhook-secret>
HYPERPAY_TEST_MODE=false
```

## Database Setup

After deploying, run the schema:

```bash
# Connect to Railway PostgreSQL
railway connect postgres

# Run schema (from local machine)
railway run psql -f ../database/schema.sql
```

Or via Railway shell:
```bash
railway shell
psql $DATABASE_URL -f /app/database/schema.sql
```

## Deployment Steps

### Option 1: Railway CLI

```bash
cd backend
railway login
railway init
railway add -d postgres
railway add -d redis
railway up
```

### Option 2: GitHub Integration

1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. New Project > Deploy from GitHub repo
4. Select `backend` folder as root directory
5. Add PostgreSQL and Redis plugins
6. Set environment variables
7. Deploy

## Custom Domain

1. Railway Dashboard > Settings > Domains
2. Add custom domain
3. Configure DNS CNAME to `*.up.railway.app`

## Monitoring

- Logs: `railway logs`
- Metrics: Railway dashboard > Observability
- Health: `https://your-app.railway.app/health`

## Troubleshooting

### Build Fails
- Check Node version >= 18
- Verify `npm run build` works locally

### Database Connection
- Ensure `DB_SSL=true` for Railway PostgreSQL
- Check `DATABASE_URL` is set

### Health Check Fails
- Verify `/health` endpoint returns 200
- Check `PORT` matches Railway's assigned port

## Cost Estimate

Railway Hobby plan ($5/month):
- Backend: ~$5-10/month (depends on usage)
- PostgreSQL: ~$5-10/month (depends on size)
- Redis: ~$3-5/month

Total: ~$15-25/month for small-medium traffic
