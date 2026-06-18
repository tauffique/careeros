-- CareerOS Database Schema
-- Run this on your Railway PostgreSQL instance

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clerk_id VARCHAR(255) UNIQUE NOT NULL,    -- from Clerk auth
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    linkedin_url VARCHAR(500),
    github_url VARCHAR(500),
    portfolio_url VARCHAR(500),
    ui_language VARCHAR(10) DEFAULT 'en',     -- app UI language
    output_language VARCHAR(50) DEFAULT 'English', -- CV/CL output language
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Education ────────────────────────────────────────────────────────────────
CREATE TABLE education (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    institution VARCHAR(255) NOT NULL,
    degree VARCHAR(255),
    field VARCHAR(255),
    location VARCHAR(255),
    start_date VARCHAR(50),
    end_date VARCHAR(50),
    display_order INT DEFAULT 0
);

-- ── Certifications ───────────────────────────────────────────────────────────
CREATE TABLE certifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    issuer VARCHAR(255),
    date_obtained VARCHAR(50),
    display_order INT DEFAULT 0
);

-- ── Projects (source of truth — synced to ChromaDB) ─────────────────────────
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    category VARCHAR(255),
    stack TEXT[],                             -- array of tech stack items
    description TEXT NOT NULL,               -- long text — what gets embedded
    date_range VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,          -- soft delete / hide from KB
    chroma_synced BOOLEAN DEFAULT FALSE,     -- has been ingested into ChromaDB
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Applications (tracker) ───────────────────────────────────────────────────
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    company VARCHAR(255),
    role VARCHAR(500),
    location VARCHAR(255),
    job_type VARCHAR(50),                    -- internship/fulltime/werkstudent
    jd_text TEXT,
    ats_score_before INT,                    -- 0-100
    ats_score_after INT,                     -- 0-100
    missing_keywords_before TEXT[],
    matched_keywords_before TEXT[],
    missing_keywords_after TEXT[],
    generated_cv_latex TEXT,
    generated_cl_latex TEXT,
    output_language VARCHAR(50) DEFAULT 'English',
    status VARCHAR(50) DEFAULT 'draft',     -- draft/applied/interview/offer/rejected
    applied_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_active ON projects(user_id, is_active);
CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_status ON applications(user_id, status);

-- ── Updated_at trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
