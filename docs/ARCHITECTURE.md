# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │  Flutter Mobile  │    │  Next.js Web     │                   │
│  │  Application     │    │  Dashboard       │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           └───────────────┬───────┘                              │
│                           │                                      │
├─────────────────────────────────────────────────────────────────┤
│                    AUTHENTICATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         Firebase Authentication & JWT Tokens             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           │                                      │
├─────────────────────────────────────────────────────────────────┤
│                      API GATEWAY LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            FastAPI Backend (Python)                      │   │
│  │  • User Management                                       │   │
│  │  • Client Management                                     │   │
│  │  • Audit Workflow                                        │   │
│  │  • Task Management                                       │   │
│  │  • Document Processing                                  │   │
│  │  • AI Integration                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│           │              │              │              │        │
├─────────────────────────────────────────────────────────────────┤
│                    DATA & STORAGE LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  PostgreSQL  │  │    Redis     │  │   AWS S3     │           │
│  │  Database    │  │    Cache     │  │   Storage    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                    EXTERNAL SERVICES                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Gemini API   │  │ AWS Textract │  │   Firebase   │           │
│  │ (AI Engine)  │  │ (OCR)        │  │   Storage    │           │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## API Routes

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `GET /api/v1/auth/me` - Get current user

### Clients
- `GET /api/v1/clients` - List all clients
- `GET /api/v1/clients/{id}` - Get specific client
- `POST /api/v1/clients` - Create new client
- `PUT /api/v1/clients/{id}` - Update client
- `DELETE /api/v1/clients/{id}` - Delete client

### Audits
- `GET /api/v1/audits` - List all audits
- `GET /api/v1/audits/{id}` - Get specific audit
- `POST /api/v1/audits` - Create new audit
- `PUT /api/v1/audits/{id}` - Update audit
- `DELETE /api/v1/audits/{id}` - Delete audit

### Tasks
- `GET /api/v1/tasks` - List all tasks
- `GET /api/v1/tasks/{id}` - Get specific task
- `POST /api/v1/tasks` - Create new task
- `PUT /api/v1/tasks/{id}` - Update task
- `DELETE /api/v1/tasks/{id}` - Delete task

### Documents
- `GET /api/v1/documents` - List all documents
- `GET /api/v1/documents/{id}` - Get specific document
- `POST /api/v1/documents/upload` - Upload document
- `PUT /api/v1/documents/{id}` - Update document verification
- `DELETE /api/v1/documents/{id}` - Delete document

## Data Flow

### User Authentication Flow
1. User enters credentials in Flutter/Next.js app
2. Firebase creates/verifies user account
3. Firebase returns ID token
4. App sends ID token to FastAPI backend
5. Backend verifies token with Firebase
6. Backend generates JWT token
7. JWT token stored in app's local storage
8. Subsequent requests include JWT token in header

### Audit Creation Flow
1. User creates audit in dashboard
2. Dashboard sends POST to `/api/v1/audits`
3. Backend creates audit in PostgreSQL
4. Backend returns audit data with ID
5. Dashboard updates UI with new audit
6. User can now manage tasks/documents for audit

### Document Upload Flow
1. User selects document in mobile/web app
2. App reads file from device storage
3. App uploads file to `/api/v1/documents/upload`
4. Backend uploads file to AWS S3
5. Backend stores document metadata in PostgreSQL
6. Backend returns document record with S3 URL
7. App displays upload confirmation

## Multi-Tenancy

Each CA firm is a separate workspace:
- `workspace_id` field in all tables
- Users filtered by workspace
- Data isolation at database query level
- Scalable architecture for SaaS deployment

## Security

- **Authentication**: Firebase Auth + JWT
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Encrypted transmission (HTTPS)
- **Audit Logs**: All operations logged
- **API Rate Limiting**: Implement in production
- **CORS**: Configured for specific domains

## Deployment Architecture

### Production

```
Frontend Layer:
├── Next.js on Vercel (auto-scaling, CDN)
└── Flutter builds on App Stores

Backend Layer:
├── FastAPI on Render/Railway (auto-scaling containers)
└── Workers for background jobs

Data Layer:
├── PostgreSQL on Supabase (managed, replicated)
├── Redis on Upstash (managed cache)
└── S3 on AWS (object storage)

Monitoring:
├── Sentry (error tracking)
├── DataDog (performance monitoring)
└── CloudWatch (infrastructure monitoring)
```

## Performance Optimization

1. **Caching**: Redis for frequently accessed data
2. **CDN**: Vercel CDN for static assets
3. **Database Indexing**: Indexes on common query fields
4. **API Pagination**: Limit results for large datasets
5. **Image Optimization**: Compress on upload to S3
6. **Connection Pooling**: Configured in database layer

## Scalability Considerations

1. **Horizontal Scaling**: Stateless FastAPI services
2. **Database Replication**: PostgreSQL replicas for read-heavy operations
3. **Message Queue**: Background jobs for document processing
4. **Microservices**: Separate services for AI, OCR, reporting
5. **Load Balancing**: AWS ELB or Render's built-in load balancing
