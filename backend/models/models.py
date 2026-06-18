"""
models/models.py — SQLAlchemy ORM models matching schema.sql
"""
from sqlalchemy import Column, String, Boolean, Integer, Text, ARRAY, TIMESTAMP
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
from db.database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    clerk_id = Column(String(255), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    full_name = Column(String(255))
    phone = Column(String(50))
    address = Column(Text)
    linkedin_url = Column(String(500))
    github_url = Column(String(500))
    portfolio_url = Column(String(500))
    ui_language = Column(String(10), default="en")
    output_language = Column(String(50), default="English")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class Education(Base):
    __tablename__ = "education"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    institution = Column(String(255), nullable=False)
    degree = Column(String(255))
    field = Column(String(255))
    location = Column(String(255))
    start_date = Column(String(50))
    end_date = Column(String(50))
    display_order = Column(Integer, default=0)

class Certification(Base):
    __tablename__ = "certifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(500), nullable=False)
    issuer = Column(String(255))
    date_obtained = Column(String(50))
    display_order = Column(Integer, default=0)

class Project(Base):
    __tablename__ = "projects"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(500), nullable=False)
    category = Column(String(255))
    stack = Column(ARRAY(Text))
    description = Column(Text, nullable=False)
    date_range = Column(String(100))
    is_active = Column(Boolean, default=True)
    chroma_synced = Column(Boolean, default=False)
    display_order = Column(Integer, default=0)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

class Application(Base):
    __tablename__ = "applications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), nullable=False)
    company = Column(String(255))
    role = Column(String(500))
    location = Column(String(255))
    job_type = Column(String(50))
    jd_text = Column(Text)
    ats_score_before = Column(Integer)
    ats_score_after = Column(Integer)
    missing_keywords_before = Column(ARRAY(Text))
    matched_keywords_before = Column(ARRAY(Text))
    missing_keywords_after = Column(ARRAY(Text))
    generated_cv_latex = Column(Text)
    generated_cl_latex = Column(Text)
    output_language = Column(String(50), default="English")
    status = Column(String(50), default="draft")
    applied_at = Column(TIMESTAMP(timezone=True))
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
