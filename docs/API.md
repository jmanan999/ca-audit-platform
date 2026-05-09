# API Documentation

## Base URL
```
http://localhost:8000/api/v1
```

## Authentication
All endpoints (except `/auth/register` and `/auth/login`) require a Bearer token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Error Responses

All errors follow this format:

```json
{
  "detail": "Error message description"
}
```

Common status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `500`: Internal Server Error

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Creates a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+91 9999999999",
  "role": "auditor",
  "department": "Audit"
}
```

**Response (201):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+91 9999999999",
  "role": "auditor",
  "is_active": true,
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

---

### Login User
**POST** `/auth/login`

Authenticates user and returns JWT token.

**Request Body:**
```json
{
  "firebase_token": "<firebase_id_token>"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "auditor"
  }
}
```

---

### Get Current User
**GET** `/auth/me`

Returns current authenticated user's information.

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "phone": "+91 9999999999",
  "role": "auditor",
  "is_active": true
}
```

---

## Client Endpoints

### List Clients
**GET** `/clients?skip=0&limit=100`

List all clients with pagination.

**Query Parameters:**
- `skip` (int): Number of records to skip (default: 0)
- `limit` (int): Number of records to return (default: 100)

**Response (200):**
```json
[
  {
    "id": 1,
    "company_name": "ABC Corporation",
    "gst_number": "27AABCT1234H1Z0",
    "pan_number": "AAAPB1234K",
    "industry": "Manufacturing",
    "contact_person": "John Smith",
    "contact_email": "john@abc.com",
    "contact_phone": "+91 9876543210",
    "financial_year": "2023-24",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### Get Specific Client
**GET** `/clients/{id}`

**Response (200):**
```json
{
  "id": 1,
  "company_name": "ABC Corporation",
  "gst_number": "27AABCT1234H1Z0",
  "industry": "Manufacturing"
}
```

---

### Create Client
**POST** `/clients`

**Request Body:**
```json
{
  "company_name": "XYZ Pvt Ltd",
  "gst_number": "27AAXYZ1234H1Z0",
  "pan_number": "AAAXYZ1234K",
  "cin_number": "U12345AB1234XYZ",
  "industry": "IT Services",
  "contact_person": "Jane Doe",
  "contact_email": "jane@xyz.com",
  "contact_phone": "+91 8765432109",
  "financial_year": "2023-24",
  "address": "123 Tech Street, Bangalore"
}
```

**Response (201):**
```json
{
  "id": 2,
  "company_name": "XYZ Pvt Ltd",
  "gst_number": "27AAXYZ1234H1Z0",
  "industry": "IT Services",
  "created_at": "2024-01-15T11:00:00Z"
}
```

---

### Update Client
**PUT** `/clients/{id}`

**Request Body (all fields optional):**
```json
{
  "company_name": "XYZ Pvt Ltd Updated",
  "industry": "IT Services and Consulting"
}
```

**Response (200):** Updated client object

---

### Delete Client
**DELETE** `/clients/{id}`

**Response (200):**
```json
{
  "status": "success"
}
```

---

## Audit Endpoints

### List Audits
**GET** `/audits?status=in_progress&client_id=1&skip=0&limit=100`

**Query Parameters:**
- `status` (enum): `planned`, `in_progress`, `under_review`, `completed`, `on_hold`
- `client_id` (int): Filter by client
- `skip` (int): Pagination offset
- `limit` (int): Number of records

**Response (200):**
```json
[
  {
    "id": 1,
    "client_id": 1,
    "assigned_to": 2,
    "audit_type": "Financial Audit",
    "status": "in_progress",
    "risk_level": "medium",
    "deadline": "2024-03-31T23:59:59Z",
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### Create Audit
**POST** `/audits`

**Request Body:**
```json
{
  "client_id": 1,
  "audit_type": "Financial Audit",
  "risk_level": "high",
  "scope": "Complete financial audit for FY 2023-24",
  "deadline": "2024-03-31T23:59:59Z",
  "assigned_to": 2,
  "description": "Annual financial audit"
}
```

**Response (201):** Created audit object with id

---

### Update Audit
**PUT** `/audits/{id}`

**Request Body (all fields optional):**
```json
{
  "status": "completed",
  "risk_level": "low",
  "assigned_to": 3
}
```

**Response (200):** Updated audit object

---

## Task Endpoints

### List Tasks
**GET** `/tasks?audit_id=1&status=pending&assigned_to=2`

**Query Parameters:**
- `audit_id` (int): Filter by audit
- `status` (enum): `pending`, `in_progress`, `completed`, `blocked`
- `assigned_to` (int): Filter by user
- `skip`, `limit`: Pagination

**Response (200):**
```json
[
  {
    "id": 1,
    "audit_id": 1,
    "title": "Review GST Invoices",
    "status": "in_progress",
    "priority": "high",
    "deadline": "2024-02-28T23:59:59Z",
    "assigned_to": 2,
    "time_spent": 8
  }
]
```

---

### Create Task
**POST** `/tasks`

**Request Body:**
```json
{
  "audit_id": 1,
  "title": "Review Bank Statements",
  "description": "Verify bank reconciliation",
  "priority": "high",
  "deadline": "2024-02-20T23:59:59Z",
  "estimated_hours": 4,
  "assigned_to": 2
}
```

---

### Update Task
**PUT** `/tasks/{id}`

**Request Body:**
```json
{
  "status": "completed",
  "time_spent": 5
}
```

---

## Document Endpoints

### List Documents
**GET** `/documents?audit_id=1&verification_status=pending`

**Query Parameters:**
- `audit_id` (int): Filter by audit
- `verification_status` (enum): `pending`, `verified`, `rejected`, `needs_review`

**Response (200):**
```json
[
  {
    "id": 1,
    "audit_id": 1,
    "file_name": "invoice_2024_01.pdf",
    "file_path": "https://ca-audit-docs.s3.amazonaws.com/...",
    "file_size": 256000,
    "document_type": "gst_invoice",
    "verification_status": "pending",
    "uploaded_by": 2,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

---

### Upload Document
**POST** `/documents/upload` (multipart/form-data)

**Form Parameters:**
- `audit_id` (int): Audit ID
- `file` (file): Document file

**Response (201):**
```json
{
  "id": 1,
  "audit_id": 1,
  "file_name": "invoice_2024_01.pdf",
  "file_path": "https://...",
  "verification_status": "pending"
}
```

---

### Update Document
**PUT** `/documents/{id}`

**Request Body:**
```json
{
  "verification_status": "verified",
  "rejection_reason": null
}
```

---

### Delete Document
**DELETE** `/documents/{id}`

**Response (200):**
```json
{
  "status": "success"
}
```

---

## Response Headers

All successful responses include:
- `Content-Type: application/json`
- `X-Process-Time`: Processing time in seconds

---

## Rate Limiting

Coming in production deployment. Currently no limits.

---

## Webhooks

Coming in future version.

---

## SDK Examples

### Python
```python
import requests

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

# Get audits
response = requests.get(
    "http://localhost:8000/api/v1/audits",
    headers=headers
)
audits = response.json()
```

### JavaScript/TypeScript
```typescript
const headers = {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
};

const response = await fetch("http://localhost:8000/api/v1/audits", {
  headers
});
const audits = await response.json();
```

### cURL
```bash
curl -X GET http://localhost:8000/api/v1/audits \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```
