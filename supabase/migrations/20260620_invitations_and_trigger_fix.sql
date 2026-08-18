-- Invitations table for SaaS user registration flow
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'professional' CHECK (role IN ('admin', 'professional')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'revoked')),
  token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Super Admin e Admin podem gerir convites
CREATE POLICY "invitations read super_admin_admin" ON public.invitations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "invitations insert super_admin" ON public.invitations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "invitations update super_admin" ON public.invitations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "invitations delete super_admin" ON public.invitations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_company ON public.invitations(company_id);

-- Service role access for all operations
CREATE POLICY "service_role full access invitations" ON public.invitations
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- FIXED trigger: handle_new_user with invitations support
-- When a user signs up:
-- 1. Check if invitation exists in raw_user_meta_data
-- 2. Create profile with company_id and role from invitation
-- 3. Mark invitation as accepted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
BEGIN
  -- Determine company_id and role from user metadata (set during signUp)
  v_company_id := NEW.raw_user_meta_data->>'company_id';
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'professional');
  
  -- Validate: super_admin must have NULL company_id, others need company_id
  IF v_role = 'super_admin' THEN
    v_company_id := NULL;
  ELSIF v_company_id IS NULL THEN
    -- For non-super-admin without company_id, this is an error condition
    -- We'll still create the profile but it won't be usable until company is assigned
    RAISE WARNING 'User % signed up without company_id. Role: %', NEW.email, v_role;
  END IF;

  INSERT INTO public.profiles (id, email, name, role, company_id, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_role,
    v_company_id,
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    company_id = COALESCE(EXCLUDED.company_id, profiles.company_id),
    updated_at = now();

  -- Mark invitation as accepted if company_id was provided
  IF v_company_id IS NOT NULL THEN
    UPDATE public.invitations
    SET status = 'accepted',
        updated_at = now()
    WHERE email = NEW.email
      AND status = 'pending';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();