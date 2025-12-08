
-- Create key_pairs table
CREATE TABLE IF NOT EXISTS public.key_pairs (
    key_id VARCHAR(255) PRIMARY KEY,
    doctor_id VARCHAR(255) NOT NULL,
    patient_id VARCHAR(255) NOT NULL,
    encryption_key TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    expires_at TIMESTAMP WITH TIME ZONE, -- Added this column
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_key_pairs_users ON public.key_pairs(doctor_id, patient_id);
CREATE INDEX IF NOT EXISTS idx_key_pairs_status ON public.key_pairs(status);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    user_id VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    target TEXT,
    result VARCHAR(50),
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for searching audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs(timestamp);

-- Policy to allow authenticated access
ALTER TABLE public.key_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable access for service role" ON public.key_pairs
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access for service role" ON public.audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Ensure encrypted_files exists
CREATE TABLE IF NOT EXISTS public.encrypted_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    owner_id VARCHAR(255) NOT NULL,
    original_filename TEXT NOT NULL,
    encrypted_filename TEXT NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_extension VARCHAR(50),
    encryption_metadata JSONB,
    storage_bucket VARCHAR(100),
    storage_path TEXT,
    upload_status VARCHAR(50) default 'pending',
    is_deleted BOOLEAN DEFAULT FALSE,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Connections Table (Modified to use TEXT for IDs)
CREATE TABLE IF NOT EXISTS public.doctor_patient_connections (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    doctor_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- File Shares Table (Modified to use TEXT for IDs)
CREATE TABLE IF NOT EXISTS public.file_shares (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    file_id UUID REFERENCES public.encrypted_files(id),
    shared_by TEXT NOT NULL,
    shared_with TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Policies for Connections
ALTER TABLE public.doctor_patient_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access for service role" ON public.doctor_patient_connections FOR ALL USING (true) WITH CHECK (true);

-- Policies for Shares
ALTER TABLE public.file_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access for service role" ON public.file_shares FOR ALL USING (true) WITH CHECK (true);
