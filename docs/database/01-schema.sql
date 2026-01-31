-- HazardOS Database Schema
-- Run this in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE hazard_type AS ENUM ('asbestos', 'mold', 'lead', 'vermiculite', 'other');
CREATE TYPE assessment_status AS ENUM ('draft', 'submitted', 'estimated', 'quoted', 'scheduled', 'completed');
CREATE TYPE user_role AS ENUM ('admin', 'estimator', 'technician', 'viewer');

-- Organizations table
CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    license_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role user_role DEFAULT 'estimator',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessments table
CREATE TABLE assessments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    estimator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Job Information
    job_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(20),
    site_address TEXT NOT NULL,
    site_city VARCHAR(100) NOT NULL,
    site_state VARCHAR(50) NOT NULL,
    site_zip VARCHAR(20) NOT NULL,
    site_location POINT, -- GPS coordinates
    
    -- Hazard Classification
    hazard_type hazard_type NOT NULL,
    hazard_subtype VARCHAR(255),
    containment_level INTEGER CHECK (containment_level BETWEEN 1 AND 4),
    
    -- Area/Scope
    area_sqft DECIMAL(10,2),
    linear_ft DECIMAL(10,2),
    volume_cuft DECIMAL(10,2),
    material_type VARCHAR(255),
    
    -- Site Conditions
    occupied BOOLEAN DEFAULT FALSE,
    access_issues TEXT[], -- Array of access issues
    special_conditions TEXT,
    
    -- Risk Assessment
    clearance_required BOOLEAN DEFAULT FALSE,
    clearance_lab VARCHAR(255),
    regulatory_notifications_needed BOOLEAN DEFAULT FALSE,
    
    -- Documentation
    notes TEXT,
    
    -- Status
    status assessment_status DEFAULT 'draft'
);

-- Photos table
CREATE TABLE photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
    url TEXT NOT NULL, -- Supabase Storage URL
    thumbnail_url TEXT,
    caption TEXT,
    gps_coordinates POINT,
    file_size INTEGER,
    file_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment catalog table
CREATE TABLE equipment_catalog (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    daily_rate DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Materials catalog table
CREATE TABLE materials_catalog (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    unit VARCHAR(50), -- e.g., 'sqft', 'linear ft', 'each'
    unit_cost DECIMAL(10,2) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estimates table
CREATE TABLE estimates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Duration
    estimated_duration_days INTEGER NOT NULL,
    estimated_labor_hours DECIMAL(8,2) NOT NULL,
    
    -- Crew
    crew_type VARCHAR(100),
    crew_size INTEGER NOT NULL,
    labor_rate_per_hour DECIMAL(8,2) NOT NULL,
    
    -- Equipment (stored as JSONB for flexibility)
    equipment_needed JSONB DEFAULT '[]',
    equipment_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Materials (stored as JSONB for flexibility)
    materials_needed JSONB DEFAULT '[]',
    materials_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Disposal
    disposal_method VARCHAR(255),
    disposal_cost DECIMAL(10,2) DEFAULT 0,
    
    -- Costs
    total_direct_cost DECIMAL(10,2) NOT NULL,
    markup_percentage DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL,
    
    -- Overrides (stored as JSONB)
    overrides JSONB DEFAULT '[]',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE
);

-- Jobs/Projects table (when estimate is accepted)
CREATE TABLE jobs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id) ON DELETE CASCADE NOT NULL,
    estimate_id UUID REFERENCES estimates(id) ON DELETE CASCADE NOT NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    
    -- Job details
    job_number VARCHAR(50) UNIQUE NOT NULL,
    start_date DATE,
    end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    
    -- Assignment
    assigned_crew JSONB DEFAULT '[]', -- Array of profile IDs
    project_manager_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, cancelled
    
    -- Actual costs (for learning)
    actual_labor_hours DECIMAL(8,2),
    actual_material_cost DECIMAL(10,2),
    actual_equipment_cost DECIMAL(10,2),
    actual_disposal_cost DECIMAL(10,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_assessments_organization_id ON assessments(organization_id);
CREATE INDEX idx_assessments_estimator_id ON assessments(estimator_id);
CREATE INDEX idx_assessments_status ON assessments(status);
CREATE INDEX idx_assessments_hazard_type ON assessments(hazard_type);
CREATE INDEX idx_assessments_created_at ON assessments(created_at);

CREATE INDEX idx_photos_assessment_id ON photos(assessment_id);
CREATE INDEX idx_estimates_assessment_id ON estimates(assessment_id);
CREATE INDEX idx_jobs_organization_id ON jobs(organization_id);
CREATE INDEX idx_jobs_status ON jobs(status);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_assessments_updated_at BEFORE UPDATE ON assessments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();