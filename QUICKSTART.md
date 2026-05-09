# CA Audit Platform - Quick Start Guide

## Overview

This is an AI-powered audit management platform for CA firms. It includes:
- **Backend**: FastAPI (Python)
- **Web Dashboard**: Next.js (TypeScript/React)
- **Mobile App**: Flutter
- **Database**: PostgreSQL
- **AI**: Google Gemini API
- **Storage**: AWS S3

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- Flutter 3.10+

### 1. Clone & Setup

```bash
# Clone repository
git clone <repository-url>
cd ca-audit-platform

# Run setup script
chmod +x setup.sh
./setup.sh
```

### 2. Configure Environment

#### Backend (`fastapi_backend/.env`)
```
DATABASE_URL=postgresql://user:password@localhost:5432/ca_audit_db
SECRET_KEY=your-secret-key
FIREBASE_PROJECT_ID=your-firebase-project
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
GEMINI_API_KEY=your-gemini-key
```

#### Web Dashboard (`nextjs_dashboard/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
```

#### Mobile App (`flutter_app/lib/firebase_options.dart`)
Update with your Firebase configuration.

### 3. Start Services

**Terminal 1 - Backend:**
```bash
cd fastapi_backend
source venv/bin/activate
uvicorn main:app --reload
# Runs on http://localhost:8000
```

**Terminal 2 - Web:**
```bash
cd nextjs_dashboard
npm run dev
# Runs on http://localhost:3000
```

**Terminal 3 - Mobile:**
```bash
cd flutter_app
flutter run
```

## Accessing the Application

### Web Dashboard
- **URL**: http://localhost:3000
- **Login**: Use Firebase email/password
- **Dashboard**: View audits, clients, tasks, documents

### Backend API
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### Mobile App
- **Emulator**: Run `flutter run`
- **Physical Device**: `flutter run -d <device_id>`

## Key Features

### Authentication
- Email/password registration
- Firebase integration
- JWT token-based API authentication
- Role-based access control

### Client Management
- Add and manage CA firm clients
- Track GST, PAN, and company information
- Maintain client contact details

### Audit Workflow
- Create and manage audits
- Assign audits to team members
- Track audit status and progress
- Set risk levels and deadlines

### Task Management
- Create tasks within audits
- Assign to team members
- Track task status and time spent
- Set priorities and deadlines

### Document Management
- Upload audit-related documents
- Verify document status
- Extract data using AI
- Store securely on AWS S3

### Dashboard Analytics
- View total audits count
- Track active, completed, pending audits
- See team workload
- Monitor compliance metrics

## Directory Structure

```
ca-audit-platform/
├── fastapi_backend/        # Backend API
├── nextjs_dashboard/       # Web app
├── flutter_app/            # Mobile app
├── docs/                   # Documentation
│   ├── ARCHITECTURE.md     # System design
│   ├── DEVELOPMENT.md      # Dev guide
│   ├── API.md             # API docs
│   └── DEPLOYMENT.md      # Production setup
└── README.md
```

## Common Tasks

### Add a New Audit
1. Login to dashboard
2. Go to Audits section
3. Click "Create Audit"
4. Fill in client, type, scope, deadline
5. Assign to auditor

### Upload a Document
1. Open audit
2. Go to Documents tab
3. Click "Upload"
4. Select file from device
5. Wait for upload to complete

### Create a Task
1. Open audit
2. Go to Tasks tab
3. Click "Create Task"
4. Set title, priority, deadline
5. Assign to team member

### View Analytics
1. Go to Dashboard
2. See widget cards at top
3. View recent audits table
4. Filter by status/client

## API Examples

### Create an Audit
```bash
curl -X POST http://localhost:8000/api/v1/audits \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": 1,
    "audit_type": "Financial Audit",
    "risk_level": "high",
    "deadline": "2024-03-31T23:59:59Z"
  }'
```

### Get All Tasks
```bash
curl -X GET http://localhost:8000/api/v1/tasks?audit_id=1 \
  -H "Authorization: Bearer <token>"
```

### Upload Document
```bash
curl -X POST http://localhost:8000/api/v1/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "audit_id=1" \
  -F "file=@/path/to/document.pdf"
```

See [docs/API.md](docs/API.md) for complete API reference.

## Troubleshooting

### Backend won't start
```bash
# Check if port 8000 is free
lsof -i :8000

# Check database connection
psql $DATABASE_URL -c "SELECT 1"

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Web dashboard won't start
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall node modules
rm -rf node_modules
npm install
```

### Mobile app won't run
```bash
# Clean Flutter build
flutter clean
flutter pub get

# Rebuild
flutter run
```

### Database connection error
```bash
# Start PostgreSQL (if using Docker)
docker run --name ca-audit-db -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres:14

# Initialize schema
python -c "from app.core.database import init_db; init_db()"
```

## Documentation

- [Architecture Overview](docs/ARCHITECTURE.md) - System design and components
- [Development Guide](docs/DEVELOPMENT.md) - Local setup and development
- [API Documentation](docs/API.md) - Complete API reference
- [Deployment Guide](docs/DEPLOYMENT.md) - Production setup

## Next Steps

1. **Setup local development** - Follow Quick Start above
2. **Read Architecture** - Understand system design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
3. **Explore API** - Visit http://localhost:8000/docs for interactive API docs
4. **Review Code** - Check backend/frontend implementation
5. **Run Tests** - `pytest` for backend, `npm test` for frontend
6. **Deploy** - Follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for production

## Support & Resources

- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **Next.js Docs**: https://nextjs.org/docs
- **Flutter Docs**: https://flutter.dev/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Firebase Docs**: https://firebase.google.com/docs

## License

Proprietary - All rights reserved

## Questions?

Create an issue or contact the development team.
