-- DIAGNOSTIC/MIGRATION TO FIX handle_new_user TRIGGER
-- This fixes the profile creation on signUp

-- First, let's check what's currently in the trigger
-- Run this to see the current trigger definition:
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';

-- DROP OLD TRIGGER
DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- CREATE NEW TRIGGER WITH PROPER DEBUGGING
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_role text;
  v_error_msg text;
BEGIN
  -- Extract values from metadata
  v_company_id := NEW.raw_user_meta_data->>'company_id';
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'professional');
  
  -- Log the metadata for debugging
  RAISE LOG 'handle_new_user: metadata=%', NEW.raw_user_meta_data;
  RAISE LOG 'handle_new_user: v_company_id=%', v_company_id;
  RAISE LOG 'handle_new_user: v_role=%', v_role;
  
  -- Create profile
  BEGIN
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
    
    RAISE LOG 'handle_new_user: profile inserted for user %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE LOG 'handle_new_user: ERROR inserting profile: %', SQLERRM;
      RAISE; -- Re-raise to see the actual error
  END;

  -- Mark invitation as accepted
  IF v_company_id IS NOT NULL THEN
    UPDATE public.invitations
    SET status = 'accepted',
        updated_at = now()
    WHERE email = NEW.email
      AND status = 'pending';
    
    RAISE LOG 'handle_new_user: invitation updated for email %', NEW.email;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'handle_new_user: OVERALL ERROR: %', SQLERRM;
    RETURN NEW; -- Still return to allow user creation even if profile fails
END;
$$;

-- CREATE TRIGGER
CREATE TRIGGER trg_handle_new_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Verify the trigger was created
-- SELECT * FROM pg_trigger WHERE tgname = 'trg_handle_new_user';