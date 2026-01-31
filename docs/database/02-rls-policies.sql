-- Row Level Security Policies for HazardOS
-- Run this AFTER creating the schema

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their own organization" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can update their organization" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Profiles policies
CREATE POLICY "Users can view profiles in their organization" ON profiles
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Admins can manage profiles in their organization" ON profiles
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Assessments policies
CREATE POLICY "Users can view assessments in their organization" ON assessments
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can create assessments in their organization" ON assessments
    FOR INSERT WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update assessments in their organization" ON assessments
    FOR UPDATE USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete assessments in their organization" ON assessments
    FOR DELETE USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Photos policies
CREATE POLICY "Users can view photos for assessments in their organization" ON photos
    FOR SELECT USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can create photos for assessments in their organization" ON photos
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can update photos for assessments in their organization" ON photos
    FOR UPDATE USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Users can delete photos for assessments in their organization" ON photos
    FOR DELETE USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

-- Equipment catalog policies
CREATE POLICY "Users can view equipment in their organization" ON equipment_catalog
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage equipment in their organization" ON equipment_catalog
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'estimator')
        )
    );

-- Materials catalog policies
CREATE POLICY "Users can view materials in their organization" ON materials_catalog
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage materials in their organization" ON materials_catalog
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'estimator')
        )
    );

-- Estimates policies
CREATE POLICY "Users can view estimates for assessments in their organization" ON estimates
    FOR SELECT USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Estimators can create estimates in their organization" ON estimates
    FOR INSERT WITH CHECK (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'estimator')
        )
    );

CREATE POLICY "Estimators can update estimates in their organization" ON estimates
    FOR UPDATE USING (
        assessment_id IN (
            SELECT a.id FROM assessments a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'estimator')
        )
    );

-- Jobs policies
CREATE POLICY "Users can view jobs in their organization" ON jobs
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Admins can manage jobs in their organization" ON jobs
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'estimator')
        )
    );

-- Create a function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();