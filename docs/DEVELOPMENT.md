# Development Guide

## Local Development Setup

### Requirements
- Node.js 18.x
- Python 3.10+
- PostgreSQL 14+
- Flutter 3.10+
- Git
- Docker (optional, for PostgreSQL)

### 1. Clone Repository

```bash
git clone <repository-url>
cd ca-audit-platform
```

### 2. Setup Backend

#### Install Python Dependencies

```bash
cd fastapi_backend
python -m venv venv

# macOS/Linux
source venv/bin/activate

# Windows
venv\Scripts\activate

pip install -r requirements.txt
```

#### Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```
DATABASE_URL=postgresql://user:password@localhost:5432/ca_audit_db
SECRET_KEY=your-secret-key-for-development-only
FIREBASE_PROJECT_ID=your_firebase_project_id
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
GEMINI_API_KEY=your_gemini_api_key
```

#### Setup PostgreSQL

**Using Docker:**

```bash
docker run --name ca-audit-db \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=ca_audit_db \
  -p 5432:5432 \
  -d postgres:14
```

**Or install locally:** Follow PostgreSQL installation guide for your OS

#### Initialize Database

```bash
python -c "from app.core.database import init_db; init_db()"
```

#### Start Backend Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend runs at: `http://localhost:8000`

### 3. Setup Web Dashboard

#### Install Dependencies

```bash
cd ../nextjs_dashboard
npm install
# or
yarn install
```

#### Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
```

#### Start Development Server

```bash
npm run dev
# or
yarn dev
```

Dashboard runs at: `http://localhost:3000`

### 4. Setup Flutter Mobile App

#### Install Flutter (if not already installed)

```bash
flutter --version
```

If not installed, follow: https://flutter.dev/docs/get-started/install

#### Configure Firebase

Edit `lib/firebase_options.dart` with your Firebase configuration.

#### Run App

```bash
cd ../flutter_app

# Get dependencies
flutter pub get

# Run on emulator
flutter run

# Run on physical device
flutter run -d <device_id>
```

## Project Structure Walkthrough

### Backend (`fastapi_backend/`)

```
fastapi_backend/
├── app/
│   ├── core/
│   │   ├── config.py        # Configuration management
│   │   └── database.py      # Database setup
│   ├── models/
│   │   ├── user.py          # User model
│   │   ├── client.py        # Client model
│   │   ├── audit.py         # Audit model
│   │   ├── task.py          # Task model
│   │   └── document.py      # Document model
│   ├── routes/
│   │   ├── auth.py          # Authentication endpoints
│   │   ├── clients.py       # Client CRUD endpoints
│   │   ├── audits.py        # Audit CRUD endpoints
│   │   ├── tasks.py         # Task CRUD endpoints
│   │   └── documents.py     # Document endpoints
│   ├── schemas/
│   │   ├── user.py          # Pydantic schemas
│   │   ├── client.py
│   │   ├── audit.py
│   │   ├── task.py
│   │   └── document.py
│   └── utils/
│       ├── s3.py            # AWS S3 utilities
│       └── ai.py            # Gemini AI utilities
├── main.py                  # FastAPI app entry point
├── requirements.txt         # Python dependencies
└── migrations/              # Database migrations
```

### Web Dashboard (`nextjs_dashboard/`)

```
nextjs_dashboard/
├── src/
│   ├── pages/
│   │   ├── index.tsx        # Home page
│   │   ├── login.tsx        # Login page
│   │   ├── register.tsx     # Registration page
│   │   └── dashboard.tsx    # Dashboard page
│   ├── components/          # Reusable components
│   ├── lib/
│   │   ├── api.ts           # API client
│   │   ├── firebase.ts      # Firebase config
│   │   └── store.ts         # Zustand stores
│   └── styles/              # Global styles
├── public/                  # Static assets
├── package.json
├── tsconfig.json
└── next.config.js
```

### Mobile App (`flutter_app/`)

```
flutter_app/
├── lib/
│   ├── main.dart            # App entry point
│   ├── firebase_options.dart # Firebase config
│   ├── screens/
│   │   ├── login_screen.dart
│   │   └── dashboard_screen.dart
│   ├── services/
│   │   ├── auth_service.dart
│   │   └── api_service.dart
│   ├── models/              # Data models
│   └── widgets/             # Reusable widgets
├── assets/                  # Images, fonts
└── pubspec.yaml
```

## Development Workflow

### Making Changes

1. Create feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make changes in one or more projects

3. Test locally:
   - Backend: `pytest` for unit tests
   - Web: `npm run test` for component tests
   - Mobile: `flutter test` for unit tests

4. Commit with clear message:
   ```bash
   git commit -m "feat: add user authentication"
   ```

5. Push and create pull request

### Testing

#### Backend Tests

```bash
cd fastapi_backend
pytest                      # Run all tests
pytest tests/test_auth.py  # Run specific test file
pytest -v                   # Verbose output
```

#### Web Dashboard Tests

```bash
cd nextjs_dashboard
npm run test
npm run test -- --watch   # Watch mode
```

#### Mobile Tests

```bash
cd flutter_app
flutter test
flutter test test/services/auth_service_test.dart
```

## Common Development Tasks

### Add New API Endpoint

1. Create route in `fastapi_backend/app/routes/`
2. Create schema in `fastapi_backend/app/schemas/`
3. Add corresponding model if needed
4. Test with Swagger at `http://localhost:8000/docs`
5. Update web/mobile clients to consume endpoint

### Add New Database Table

1. Create model in `fastapi_backend/app/models/`
2. Create migration script in `fastapi_backend/migrations/`
3. Run migration: `python migrations/001_initial_schema.py`
4. Create schema and routes

### Add New Feature to Web Dashboard

1. Create page in `src/pages/` or component in `src/components/`
2. Add API calls in `src/lib/api.ts`
3. Add state management in `src/lib/store.ts`
4. Import and use in components
5. Test with `npm run dev`

### Add New Screen to Mobile App

1. Create screen in `lib/screens/`
2. Create necessary widgets in `lib/widgets/`
3. Update navigation in `lib/main.dart`
4. Add API calls using `ApiService`
5. Test with `flutter run`

## Troubleshooting

### Backend Issues

**Database connection error:**
```bash
# Check PostgreSQL is running
psql -U user -d ca_audit_db -h localhost

# Reset database
dropdb -U user ca_audit_db
createdb -U user ca_audit_db
python -c "from app.core.database import init_db; init_db()"
```

**Import errors:**
```bash
# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### Web Dashboard Issues

**Node modules issue:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**Next.js cache issue:**
```bash
rm -rf .next
npm run dev
```

### Mobile App Issues

**Flutter dependencies:**
```bash
flutter clean
flutter pub get
```

**Emulator issues:**
```bash
flutter emulators --launch emulator_name
# or
open -a Simulator  # macOS
```

## Code Style Guidelines

### Python (Backend)
- Follow PEP 8
- Use type hints
- Use docstrings for functions
- Max line length: 100 characters

### TypeScript/React (Web)
- Use Prettier for formatting
- Use ESLint rules from Next.js
- Use TypeScript strict mode
- Component names in PascalCase

### Dart (Mobile)
- Follow official Dart style guide
- Use meaningful variable names
- Add comments for complex logic
- Run `flutter analyze` to check

## Performance Tips

1. **Backend**: Use database indexes on frequently queried fields
2. **Web**: Use React.memo for expensive components
3. **Mobile**: Optimize image sizes before upload
4. **General**: Implement caching where appropriate

## Resources

- FastAPI Docs: https://fastapi.tiangolo.com/
- Next.js Docs: https://nextjs.org/docs
- Flutter Docs: https://flutter.dev/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Firebase Docs: https://firebase.google.com/docs
