# Production Deployment Guide

This guide covers deploying the Saudi Arabia Recreational Diving Platform to production using Railway (backend) and Vercel (frontend).

## Prerequisites

- Railway account (https://railway.app)
- Vercel account (https://vercel.com)
- PostgreSQL database (Railway provides this)
- Redis instance (Railway provides this)
- HyperPay merchant account (https://hyperpay.com)
- SRSA API credentials (contact SRSA for production access)
- Domain names configured

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Vercel        │     │   Railway       │
│   (Frontend)    │────▶│   (Backend)     │
│   React/Vite    │     │   Node/Express  │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
              ┌─────▼─────┐ ┌────▼────┐ ┌─────▼─────┐
              │ PostgreSQL│ │  Redis  │ │  SRSA API │
              │ (Railway) │ │(Railway)│ │ (External)│
              └───────────┘ └─────────┘ └───────────┘
```

## Step 1: Railway Backend Deployment

### 1.1 Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize project in repository root
railway init
```

### 1.2 Add PostgreSQL Database

1. Go to Railway dashboard
2. Click "New" → "Database" → "PostgreSQL"
3. Railway will automatically set `DATABASE_URL`

### 1.3 Add Redis

1. Click "New" → "Database" → "Redis"
2. Railway will automatically set `REDIS_URL`

### 1.4 Configure Environment Variables

In Railway dashboard, add these environment variables:

```bash
# Server
NODE_ENV=production
PORT=3001
API_VERSION=v1
FRONTEND_URL=https://your-frontend-domain.vercel.app

# JWT Secrets (generate with: openssl rand -base64 32)
JWT_ACCESS_SECRET=<generate-secure-random-string-min-32-chars>
JWT_REFRESH_SECRET=<generate-different-secure-random-string-min-32-chars>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Encryption (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=<64-character-hex-string>
ENCRYPTION_IV_LENGTH=16

# SRSA Integration
SRSA_API_URL=https://api.srsa.gov.sa
SRSA_API_KEY=<your-srsa-api-key>
SRSA_API_SECRET=<your-srsa-api-secret>
USE_MOCK_SRSA=false

# Email (SendGrid recommended)
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=<your-sendgrid-api-key>
EMAIL_FROM=noreply@yourdomain.sa

# HyperPay Payment Gateway
HYPERPAY_ACCESS_TOKEN=<your-hyperpay-access-token>
HYPERPAY_ENTITY_ID_MADA=<your-mada-entity-id>
HYPERPAY_ENTITY_ID_VISA=<your-visa-entity-id>
HYPERPAY_ENTITY_ID_MASTER=<your-mastercard-entity-id>
HYPERPAY_ENTITY_ID_APPLEPAY=<your-applepay-entity-id>
HYPERPAY_ENTITY_ID_STC_PAY=<your-stcpay-entity-id>
HYPERPAY_WEBHOOK_SECRET=<your-webhook-secret>
HYPERPAY_TEST_MODE=false

# CORS
ALLOWED_ORIGINS=https://your-frontend-domain.vercel.app

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 1.5 Deploy

```bash
# Deploy from repository root
railway up
```

Or connect your GitHub repository for automatic deployments.

### 1.6 Initialize Database

After first deployment, run the schema migration:

```bash
# Connect to Railway PostgreSQL
railway run psql

# Or run schema file
railway run psql < database/schema.sql
```

## Step 2: Vercel Frontend Deployment

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.2 Configure Environment Variables

Create `.env.production` in frontend directory (or set in Vercel dashboard):

```bash
VITE_API_URL=https://your-backend.railway.app/api/v1
VITE_HYPERPAY_SCRIPT_URL=https://eu-prod.oppwa.com/v1/paymentWidgets.js
```

### 2.3 Deploy

```bash
# From frontend directory
cd frontend
vercel --prod
```

Or connect your GitHub repository for automatic deployments.

### 2.4 Configure Domain

1. Go to Vercel dashboard → Project Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed by Vercel

## Step 3: Post-Deployment Configuration

### 3.1 HyperPay Webhook

Configure HyperPay to send webhooks to:
```
https://your-backend.railway.app/api/v1/payments/webhook
```

### 3.2 CORS Configuration

Ensure `ALLOWED_ORIGINS` in Railway includes your Vercel domain.

### 3.3 SSL Certificates

Both Railway and Vercel provide automatic SSL certificates.

## Environment Variables Reference

### Required for Production

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Auto-set by Railway |
| `REDIS_URL` | Redis connection string | Auto-set by Railway |
| `JWT_ACCESS_SECRET` | JWT signing key (min 32 chars) | Random secure string |
| `JWT_REFRESH_SECRET` | Refresh token signing key | Random secure string |
| `ENCRYPTION_KEY` | PII encryption key (32 bytes hex) | `openssl rand -hex 32` |
| `FRONTEND_URL` | Frontend domain for CORS | `https://yourdomain.com` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `https://yourdomain.com` |

### Payment Gateway (HyperPay)

| Variable | Description |
|----------|-------------|
| `HYPERPAY_ACCESS_TOKEN` | API access token |
| `HYPERPAY_ENTITY_ID_MADA` | Entity ID for mada cards |
| `HYPERPAY_ENTITY_ID_VISA` | Entity ID for Visa cards |
| `HYPERPAY_ENTITY_ID_MASTER` | Entity ID for Mastercard |
| `HYPERPAY_ENTITY_ID_APPLEPAY` | Entity ID for Apple Pay |
| `HYPERPAY_ENTITY_ID_STC_PAY` | Entity ID for STC Pay |
| `HYPERPAY_WEBHOOK_SECRET` | Webhook signature secret |
| `HYPERPAY_TEST_MODE` | Set to `false` for production |

### SRSA Integration

| Variable | Description |
|----------|-------------|
| `SRSA_API_URL` | SRSA API base URL |
| `SRSA_API_KEY` | API authentication key |
| `SRSA_API_SECRET` | API secret |
| `USE_MOCK_SRSA` | Set to `false` for production |

### Email (SendGrid)

| Variable | Description |
|----------|-------------|
| `EMAIL_PROVIDER` | Set to `sendgrid` |
| `SENDGRID_API_KEY` | SendGrid API key |
| `EMAIL_FROM` | Sender email address |

## Generating Secure Secrets

```bash
# JWT secrets (use different values for each)
openssl rand -base64 32

# Encryption key (64 hex characters)
openssl rand -hex 32

# Webhook secret
openssl rand -base64 24
```

## Health Checks

- Backend: `GET /health` - Returns 200 OK if healthy
- Database connectivity is checked on startup with retry logic

## Monitoring

### Railway
- View logs in Railway dashboard
- Set up alerts for deployment failures

### Recommended Additions
- Sentry for error tracking
- Datadog or similar for APM
- Uptime monitoring (e.g., UptimeRobot, Pingdom)

## Rollback

### Railway
```bash
railway rollback
```

### Vercel
Use the Vercel dashboard to redeploy a previous deployment.

## Troubleshooting

### Backend won't start
1. Check logs: `railway logs`
2. Verify all required environment variables are set
3. Ensure database is accessible

### Database connection issues
1. Check `DATABASE_URL` is correctly set
2. Verify SSL settings (`DB_SSL=true` for Railway)
3. Check connection pool limits

### CORS errors
1. Verify `ALLOWED_ORIGINS` includes frontend domain
2. Check `FRONTEND_URL` is correctly set
3. Ensure no trailing slashes in URLs

### Payment failures
1. Verify HyperPay credentials are for production (not test)
2. Check webhook URL is accessible
3. Review HyperPay dashboard for error details
