-- Create a function to sync emails from auth.users to profiles
CREATE OR REPLACE FUNCTION sync_profile_emails()
RETURNS void AS $$
BEGIN
  -- Update profiles with emails from auth.users where profiles.email is null
  UPDATE profiles 
  SET email = auth.users.email
  FROM auth.users 
  WHERE profiles.id = auth.users.id 
  AND (profiles.email IS NULL OR profiles.email = '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION sync_profile_emails() TO authenticated;

-- Run the sync function
SELECT sync_profile_emails();

-- Create a trigger to automatically sync email when a profile is created
CREATE OR REPLACE FUNCTION sync_email_on_profile_create()
RETURNS TRIGGER AS $$
BEGIN
  -- If email is not provided, get it from auth.users
  IF NEW.email IS NULL OR NEW.email = '' THEN
    SELECT email INTO NEW.email 
    FROM auth.users 
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS trigger_sync_email_on_profile_create ON profiles;
CREATE TRIGGER trigger_sync_email_on_profile_create
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_on_profile_create();