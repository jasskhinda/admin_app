require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixGraceStanleyOwner() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('🔧 Fixing Grace Stanley Facility Owner Status');
  console.log('=' .repeat(50));

  try {
    // Find Grace Stanley's facility_users entry
    const { data: graceEntry, error: graceError } = await supabase
      .from('facility_users')
      .select('*')
      .eq('user_id', '69139cb0-905a-4b36-ac81-db30df8a2116')
      .single();

    if (graceError) {
      console.error('❌ Error finding Grace Stanley entry:', graceError);
      return;
    }

    console.log('📋 Current Grace Stanley entry:', {
      user_id: graceEntry.user_id,
      facility_id: graceEntry.facility_id,
      role: graceEntry.role,
      is_owner: graceEntry.is_owner
    });

    // Update to set as owner
    const { error: updateError } = await supabase
      .from('facility_users')
      .update({
        is_owner: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', graceEntry.id);

    if (updateError) {
      console.error('❌ Error updating Grace Stanley owner status:', updateError);
      return;
    }

    console.log('✅ Grace Stanley is now marked as facility owner');

    // Verify the fix
    const { data: verifyEntry, error: verifyError } = await supabase
      .from('facility_users')
      .select('*')
      .eq('user_id', '69139cb0-905a-4b36-ac81-db30df8a2116')
      .single();

    if (verifyError) {
      console.error('❌ Error verifying fix:', verifyError);
    } else {
      console.log('✅ Verification - Grace Stanley entry:', {
        role: verifyEntry.role,
        is_owner: verifyEntry.is_owner,
        status: verifyEntry.status
      });
    }

    console.log('\n🎉 Grace Stanley facility owner status fixed!');

  } catch (error) {
    console.error('❌ Fix script error:', error);
  }
}

fixGraceStanleyOwner();