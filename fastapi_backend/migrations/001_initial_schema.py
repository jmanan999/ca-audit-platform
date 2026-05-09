"""Database migration scripts"""

# Initial schema creation SQL
CREATE_TABLES_SQL = """
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    firebase_uid VARCHAR UNIQUE NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    phone VARCHAR,
    role VARCHAR DEFAULT 'auditor',
    department VARCHAR,
    workspace_id INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_firebase_uid (firebase_uid),
    INDEX idx_email (email),
    INDEX idx_workspace_id (workspace_id)
);

-- Create clients table
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    company_name VARCHAR NOT NULL,
    gst_number VARCHAR UNIQUE NOT NULL,
    pan_number VARCHAR,
    cin_number VARCHAR,
    industry VARCHAR NOT NULL,
    contact_person VARCHAR NOT NULL,
    contact_email VARCHAR NOT NULL,
    contact_phone VARCHAR NOT NULL,
    financial_year VARCHAR NOT NULL,
    address TEXT,
    workspace_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_gst_number (gst_number),
    INDEX idx_workspace_id (workspace_id)
);

-- Create audits table
CREATE TABLE IF NOT EXISTS audits (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES users(id),
    audit_type VARCHAR NOT NULL,
    status VARCHAR DEFAULT 'planned',
    risk_level VARCHAR DEFAULT 'medium',
    scope TEXT,
    start_date TIMESTAMP,
    deadline TIMESTAMP NOT NULL,
    completion_date TIMESTAMP,
    description TEXT,
    workspace_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_client_id (client_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status),
    INDEX idx_workspace_id (workspace_id)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    assigned_to INTEGER REFERENCES users(id),
    title VARCHAR NOT NULL,
    description TEXT,
    status VARCHAR DEFAULT 'pending',
    priority VARCHAR DEFAULT 'medium',
    deadline TIMESTAMP NOT NULL,
    estimated_hours INTEGER,
    time_spent INTEGER DEFAULT 0,
    workspace_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_id (audit_id),
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_status (status),
    INDEX idx_workspace_id (workspace_id)
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    audit_id INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
    uploaded_by INTEGER REFERENCES users(id),
    file_name VARCHAR NOT NULL,
    file_path VARCHAR NOT NULL,
    file_size INTEGER,
    document_type VARCHAR DEFAULT 'other',
    verification_status VARCHAR DEFAULT 'pending',
    extracted_data TEXT,
    ai_insights TEXT,
    rejection_reason TEXT,
    workspace_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_id (audit_id),
    INDEX idx_verification_status (verification_status),
    INDEX idx_workspace_id (workspace_id)
);
"""

def init_database():
    """Initialize database with tables"""
    from app.core.database import engine
    from sqlalchemy import text
    
    with engine.connect() as connection:
        connection.execute(text(CREATE_TABLES_SQL))
        connection.commit()
