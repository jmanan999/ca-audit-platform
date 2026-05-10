# CA/Audit Platform

AI-powered audit management system for CA firms.

## Project Structure

```
ca-audit-platform/
├── flutter_app/          # Flutter mobile application
├── nextjs_dashboard/     # Next.js web dashboard
├── fastapi_backend/      # FastAPI backend API
├── docs/                 # Documentation
└── README.md
```

## Tech Stack

### Frontend
- **Mobile**: Flutter
- **Web**: Next.js + TypeScript + TailwindCSS

### Backend
- **API**: FastAPI (Python)
- **Database**: PostgreSQL
- **Cache**: Redis
- **File Storage**: AWS S3
- **Authentication**: Firebase Auth

### AI/ML
- **AI Engine**: Google Gemini API
- **OCR**: AWS Textract or Google Document AI

### Deployment
- **Web**: Vercel
- **Backend**: Render or Railway
- **Database**: Supabase or Neon
- **Storage**: AWS S3

## Getting Started

### Prerequisites
- Node.js 18+ (for web dashboard)
- Python 3.10+ (for backend)
- Flutter 3.10+ (for mobile app)
- PostgreSQL 14+
- Firebase account
- AWS account (for S3 and Textract)
- Google Cloud account (for Gemini API)

### Backend Setup

```bash
cd fastapi_backend
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Initialize database
python -c "from migrations.001_initial_schema import init_database; init_database()"

# Run server
uvicorn main:app --reload
```

### Web Dashboard Setup

```bash
cd nextjs_dashboard
npm install

# Configure environment variables
cp .env.local.example .env.local

# Start development server
npm run dev
```

### Mobile App Setup

```bash
cd flutter_app
flutter pub get

# Run on iOS/Android emulator or device
flutter run
```

## Features (MVP)

### Phase 1
- User authentication (Firebase)
- Client management
- Audit workflow creation & tracking
- Task assignment
- Document uploads
- Dashboard with analytics

### Phase 2 (Coming Soon)
- OCR document processing
- AI verification engine
- Smart reminders
- Advanced analytics

### Phase 3 (Coming Soon)
- AI audit assistant
- Automated report generation
- Predictive risk engine
- Third-party integrations (Tally, Zoho)

## API Documentation

FastAPI automatic documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Database Schema

### Core Tables
- `users` - User accounts and roles
- `clients` - CA firm clients
- `audits` - Audit workflows
- `tasks` - Audit tasks
- `documents` - Uploaded documents

## Security

- Role-based access control (RBAC)
- JWT token authentication
- End-to-end encryption for sensitive data
- Audit logs for all operations
- Multi-tenant data isolation

## Contributing

1. Create feature branch (`git checkout -b feature/AmazingFeature`)
2. Commit changes (`git commit -m 'Add AmazingFeature'`)
3. Push to branch (`git push origin feature/AmazingFeature`)
4. Open Pull Request

## License

This project is proprietary and confidential.

## Support

For support, email support@caauditplatform.com
