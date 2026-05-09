# Deployment Guide

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Firebase project created
- [ ] AWS account with S3 bucket
- [ ] Gemini API key acquired
- [ ] SSL/TLS certificates ready
- [ ] Database backups configured
- [ ] Monitoring/logging set up
- [ ] Team notified of deployment

## Production Environment Setup

### 1. Backend Deployment (FastAPI on Render)

#### Create Render Account
1. Sign up at https://render.com
2. Connect GitHub repository
3. Create new Web Service

#### Configure Render Service

**Create `render.yaml` in root:**

```yaml
services:
  - type: web
    name: ca-audit-backend
    runtime: python
    buildCommand: pip install -r fastapi_backend/requirements.txt
    startCommand: cd fastapi_backend && uvicorn main:app --host 0.0.0.0 --port 8000
    envVars:
      - key: DATABASE_URL
        scope: build,runtime
        value: postgresql://...
      - key: SECRET_KEY
        scope: build,runtime
        value: <strong-random-key>
      - key: FIREBASE_PROJECT_ID
        scope: build,runtime
        value: <your-project-id>
```

#### Deploy

```bash
git add render.yaml
git commit -m "Add Render deployment config"
git push
```

Render auto-deploys on push to main branch.

### 2. Database Setup (Supabase)

#### Create Supabase Project

1. Sign up at https://supabase.com
2. Create new project
3. Copy DATABASE_URL
4. Update in Render environment variables

#### Initialize Schema

```bash
# Connect to production database
psql $PRODUCTION_DATABASE_URL < fastapi_backend/migrations/001_initial_schema.sql
```

#### Enable Backups

In Supabase console:
- Enable automatic daily backups
- Set 30-day retention

### 3. File Storage (AWS S3)

#### Create S3 Bucket

```bash
aws s3 mb s3://ca-audit-documents --region us-east-1
```

#### Configure Bucket Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicRead",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::ca-audit-documents/*"
    }
  ]
}
```

#### Setup IAM User

1. Create IAM user with S3 access
2. Generate access key
3. Add to environment variables

### 4. Web Dashboard Deployment (Vercel)

#### Connect GitHub

1. Sign up at https://vercel.com
2. Import repository
3. Select Next.js framework

#### Configure Environment Variables

In Vercel dashboard, add:
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`

#### Deploy

```bash
vercel deploy --prod
```

Or push to main branch for auto-deployment.

### 5. Mobile App Deployment

#### iOS (App Store)

1. Create Apple Developer account
2. Update `pubspec.yaml` with bundle ID
3. Generate production certificates

```bash
flutter build ios --release
# Submit to App Store Connect
```

#### Android (Play Store)

1. Create Google Play Developer account
2. Generate release keystore

```bash
keytool -genkey -v -keystore ~/upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10950 \
  -alias upload

flutter build appbundle --release
# Upload to Google Play Console
```

## Database Migrations in Production

```bash
# Connect to production
export DATABASE_URL="postgresql://user:pass@host/db"

# Run migrations
python -c "from migrations.001_initial_schema import init_database; init_database()"
```

## SSL/TLS Configuration

### Render (Automatic)
- Render automatically provisions SSL certificates
- All traffic automatically upgraded to HTTPS

### Vercel (Automatic)
- Vercel automatically manages SSL
- All deployments use HTTPS

### Custom Domains

**Render:**
```bash
# Add custom domain in Render dashboard
# Point DNS records to Render
```

**Vercel:**
```bash
# In Vercel dashboard
# Domains → Add domain
# Follow DNS configuration
```

## Monitoring & Logging

### Application Monitoring

**Sentry Setup (Error Tracking):**

```python
# In fastapi_backend/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn="your-sentry-dsn",
    integrations=[FastApiIntegration()],
    traces_sample_rate=0.1,
)
```

### Log Aggregation

**CloudWatch Setup:**

```bash
# View backend logs
aws logs tail /aws/render/ca-audit-backend --follow
```

## Scaling

### Database Scaling

```sql
-- Add replicas for read operations
-- In Supabase: Read Replicas → Create Replica
```

### Backend Scaling

In Render:
- Auto-scaling: Set min/max instances
- Memory: Increase as needed
- Disk: Persistent volumes for uploads

### Frontend Scaling

Vercel automatically scales with traffic.

## Performance Optimization

### Backend

```python
# Add caching headers in FastAPI
from fastapi.middleware.gzip import GZIPMiddleware

app.add_middleware(GZIPMiddleware, minimum_size=1000)
```

### Frontend

```typescript
// Next.js image optimization
import Image from 'next/image';

// Automatic optimization and serving in next-gen formats
```

### Database

```sql
-- Create indexes for frequent queries
CREATE INDEX idx_audit_status ON audits(status);
CREATE INDEX idx_task_audit_id ON tasks(audit_id);
CREATE INDEX idx_document_audit_id ON documents(audit_id);
```

## Backup & Disaster Recovery

### Database Backups

**Supabase Backups:**
- Automatic daily backups
- Point-in-time recovery
- 30-day retention

**Manual Backup:**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

### S3 Backups

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket ca-audit-documents \
  --versioning-configuration Status=Enabled
```

### Application Code

```bash
# GitHub provides version control
git tag -a v1.0.0 -m "Production release"
git push origin v1.0.0
```

## Rollback Procedure

### Backend Rollback

```bash
# Render auto-enables previous deployment
# Or in Render dashboard:
# Deployments → Select previous → Redeploy
```

### Frontend Rollback

```bash
# Vercel dashboard:
# Deployments → Select previous → Promote
```

### Database Rollback

```bash
# Supabase:
# Database Backups → Restore from point-in-time
```

## Security Hardening

### API Security

```python
# Add HTTPS redirect
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["yourdomain.com", "*.yourdomain.com"]
)
```

### Database Security

```sql
-- Restrict connections to backend only
-- In Supabase: Project Settings → Database
-- Restrict network access
```

### Environment Variables

- Use Render/Vercel secrets manager
- Rotate keys regularly
- Never commit secrets to git

## Health Checks

```bash
# Test backend
curl -X GET https://api.yourdomain.com/health

# Test frontend
curl -X GET https://yourdomain.com

# Monitor with uptime service
# e.g., UptimeRobot, Checkly
```

## Performance Monitoring

### Key Metrics to Monitor

- **Backend Response Time**: Target < 200ms
- **Database Query Time**: Target < 100ms
- **Frontend LCP**: Target < 2.5s
- **API Error Rate**: Target < 0.1%
- **Uptime**: Target > 99.9%

### Tools

- Vercel Analytics (Frontend)
- Render metrics (Backend)
- Supabase PostgreSQL metrics
- Sentry error tracking

## Deployment Checklist

### Pre-Deployment

- [ ] Code reviewed and merged
- [ ] All tests passing
- [ ] Database migrations tested
- [ ] Environment variables updated
- [ ] Security scan completed

### Deployment

- [ ] Backend deployed and healthy
- [ ] Database migrations applied
- [ ] Frontend deployed and accessible
- [ ] Mobile app build updated

### Post-Deployment

- [ ] All endpoints responding
- [ ] Database backups confirmed
- [ ] Monitoring alerts active
- [ ] User communication sent
- [ ] Documentation updated

## Troubleshooting Production Issues

### Backend Down

1. Check Render dashboard for errors
2. Review Sentry error logs
3. Check database connectivity
4. Rollback to previous version if needed

### High Latency

1. Check database query performance
2. Check Render instance CPU/memory
3. Review S3 access logs
4. Check network connectivity

### Data Issues

1. Check database backups
2. Review audit logs
3. Restore from backup if needed
4. Notify users of recovery

## Post-Deployment Monitoring

- Monitor all services for 24 hours
- Check user reports and feedback
- Review performance metrics
- Verify backups working
- Document any issues

## Support

For deployment issues:
1. Check deployment logs
2. Review error tracking (Sentry)
3. Check infrastructure status
4. Contact platform support
