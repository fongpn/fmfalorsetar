-- Enable device fingerprinting
UPDATE settings SET fingerprinting_enabled = true;

-- Create authorized_devices table
CREATE TABLE IF NOT EXISTS authorized_devices (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    browser TEXT NOT NULL,
    os TEXT NOT NULL,
    device TEXT NOT NULL,
    authorized_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create device_authorization_requests table
CREATE TABLE IF NOT EXISTS device_authorization_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    browser TEXT NOT NULL,
    os TEXT NOT NULL,
    device TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'denied')),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_authorized_devices_user_id ON authorized_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_device_authorization_requests_user_id ON device_authorization_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_device_authorization_requests_status ON device_authorization_requests(status);

-- Create RLS policies
ALTER TABLE authorized_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_authorization_requests ENABLE ROW LEVEL SECURITY;

-- Policies for authorized_devices
CREATE POLICY "Users can view their own authorized devices"
    ON authorized_devices FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all authorized devices"
    ON authorized_devices FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'superadmin')
        )
    );

-- Policies for device_authorization_requests
CREATE POLICY "Users can view their own device authorization requests"
    ON device_authorization_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all device authorization requests"
    ON device_authorization_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role IN ('admin', 'superadmin')
        )
    );

-- Create function to update last_used_at
CREATE OR REPLACE FUNCTION update_device_last_used()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_used_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating last_used_at
CREATE TRIGGER update_device_last_used
    BEFORE UPDATE ON authorized_devices
    FOR EACH ROW
    EXECUTE FUNCTION update_device_last_used(); 