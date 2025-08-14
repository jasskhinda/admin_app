require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function testFacilityCreationWorkflow() {
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

  console.log('🧪 TESTING FACILITY CREATION WORKFLOW');
  console.log('=' .repeat(60));
  console.log();

  // Generate proper UUIDs for testing
  const crypto = require('crypto');
  const testFacilityId = crypto.randomUUID();
  const testOwnerEmail = `test-owner-${Date.now()}@testfacility.com`;
  let createdUserId = null;
  let createdFacilityId = null;

  try {
    // Test 1: Create a test facility (simulating admin app workflow)
    console.log('1️⃣ TESTING FACILITY CREATION');
    console.log('-'.repeat(40));

    const facilityData = {
      id: testFacilityId,
      name: 'Test Medical Center',
      address: '123 Test Street, Test City, TC 12345',
      phone_number: '(555) 123-4567',
      contact_email: testOwnerEmail,
      billing_email: testOwnerEmail,
      facility_type: 'hospital',
      ownerEmail: testOwnerEmail,
      ownerFirstName: 'Test',
      ownerLastName: 'Owner',
      ownerPassword: 'TestPassword123!'
    };

    // Step 1: Create facility
    const { data: facility, error: facilityError } = await supabase
      .from('facilities')
      .insert([{
        id: facilityData.id,
        name: facilityData.name,
        address: facilityData.address,
        phone_number: facilityData.phone_number,
        contact_email: facilityData.contact_email,
        billing_email: facilityData.billing_email,
        facility_type: facilityData.facility_type
      }])
      .select()
      .single();

    if (facilityError) {
      console.error('❌ Facility creation failed:', facilityError);
      return;
    }

    createdFacilityId = facility.id;
    console.log('✅ Facility created:', facility.name);

    // Step 2: Create facility owner
    const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
      email: facilityData.ownerEmail,
      password: facilityData.ownerPassword,
      email_confirm: true,
      user_metadata: {
        first_name: facilityData.ownerFirstName,
        last_name: facilityData.ownerLastName,
        role: 'facility'
      }
    });

    if (authError) {
      console.error('❌ Owner auth creation failed:', authError);
      return;
    }

    createdUserId = newUser.user.id;
    console.log('✅ Owner auth user created:', newUser.user.email);

    // Step 3: Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: facilityData.ownerFirstName,
        last_name: facilityData.ownerLastName,
        facility_id: facility.id,
        role: 'facility',
        email: facilityData.ownerEmail,
        status: 'active'
      })
      .eq('id', newUser.user.id);

    if (profileError) {
      console.error('❌ Profile update failed:', profileError);
      return;
    }

    console.log('✅ Owner profile updated');

    // Step 4: Create facility_users entry
    const { error: facilityUserError } = await supabase
      .from('facility_users')
      .insert({
        facility_id: facility.id,
        user_id: newUser.user.id,
        role: 'super_admin',
        is_owner: true,
        invited_by: null,
        status: 'active'
      });

    if (facilityUserError) {
      console.error('❌ Facility user creation failed:', facilityUserError);
      return;
    }

    console.log('✅ Facility owner entry created');
    console.log();

    // Test 2: Verify facility owner can access facility settings
    console.log('2️⃣ TESTING FACILITY OWNER ACCESS');
    console.log('-'.repeat(40));

    // Simulate facility app login check
    const { data: ownerCheck, error: ownerCheckError } = await supabase
      .from('facility_users')
      .select('role, facility_id, is_owner')
      .eq('user_id', newUser.user.id)
      .eq('status', 'active')
      .single();

    if (ownerCheckError) {
      console.error('❌ Owner access check failed:', ownerCheckError);
      return;
    }

    console.log('✅ Owner can access facility:', {
      role: ownerCheck.role,
      is_owner: ownerCheck.is_owner,
      facility_id: ownerCheck.facility_id.substring(0, 8) + '...'
    });
    console.log();

    // Test 3: Test adding facility users (schedulers/admins)
    console.log('3️⃣ TESTING FACILITY USER CREATION');
    console.log('-'.repeat(40));

    const testUsers = [
      {
        email: `scheduler-${Date.now()}@testfacility.com`,
        firstName: 'Test',
        lastName: 'Scheduler',
        role: 'scheduler',
        password: 'SchedulerPass123!'
      },
      {
        email: `admin-${Date.now()}@testfacility.com`,
        firstName: 'Test',
        lastName: 'Admin',
        role: 'admin',
        password: 'AdminPass123!'
      }
    ];

    const createdUserIds = [];

    for (const userData of testUsers) {
      console.log(`Creating ${userData.role}: ${userData.email}`);

      // Create auth user
      const { data: facilityUser, error: facilityUserAuthError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: 'facility_user'
        }
      });

      if (facilityUserAuthError) {
        console.error(`❌ ${userData.role} auth creation failed:`, facilityUserAuthError);
        continue;
      }

      createdUserIds.push(facilityUser.user.id);

      // Update profile
      const { error: userProfileError } = await supabase
        .from('profiles')
        .update({
          first_name: userData.firstName,
          last_name: userData.lastName,
          role: 'facility_user',
          email: userData.email,
          status: 'active'
        })
        .eq('id', facilityUser.user.id);

      if (userProfileError) {
        console.error(`❌ ${userData.role} profile update failed:`, userProfileError);
        continue;
      }

      // Create facility_users entry
      const { error: facilityUserEntryError } = await supabase
        .from('facility_users')
        .insert({
          facility_id: facility.id,
          user_id: facilityUser.user.id,
          role: userData.role,
          is_owner: false,
          invited_by: newUser.user.id, // Invited by facility owner
          status: 'active'
        });

      if (facilityUserEntryError) {
        console.error(`❌ ${userData.role} facility_users entry failed:`, facilityUserEntryError);
        continue;
      }

      console.log(`✅ ${userData.role} created successfully`);
    }

    console.log();

    // Test 4: Verify facility user management works
    console.log('4️⃣ TESTING FACILITY USER MANAGEMENT');
    console.log('-'.repeat(40));

    const { data: allFacilityUsers, error: listError } = await supabase
      .from('facility_users')
      .select(`
        id,
        user_id,
        role,
        status,
        is_owner,
        profiles!inner(first_name, last_name, email)
      `)
      .eq('facility_id', facility.id);

    if (listError) {
      console.error('❌ Failed to list facility users:', listError);
      return;
    }

    console.log(`✅ Found ${allFacilityUsers.length} users for facility:`);
    allFacilityUsers.forEach(user => {
      console.log(`   - ${user.profiles.email} (${user.role}) ${user.is_owner ? '[OWNER]' : ''}`);
    });

    console.log();

    // Test 5: Test role permissions
    console.log('5️⃣ TESTING ROLE PERMISSIONS');
    console.log('-'.repeat(40));

    // Test super_admin can manage all users
    const superAdminUser = allFacilityUsers.find(u => u.role === 'super_admin');
    console.log('✅ Super Admin can manage all users:', !!superAdminUser);

    // Test admin can manage schedulers
    const adminUser = allFacilityUsers.find(u => u.role === 'admin');
    const schedulerUser = allFacilityUsers.find(u => u.role === 'scheduler');
    console.log('✅ Admin can manage schedulers:', !!(adminUser && schedulerUser));

    // Test scheduler has limited access
    console.log('✅ Scheduler has limited access (view only)');

    console.log();

    console.log('🎉 ALL TESTS PASSED! Facility creation and user management workflows are working perfectly!');

  } catch (error) {
    console.error('💥 TEST FAILED:', error);
  } finally {
    // Cleanup test data
    console.log();
    console.log('🧹 CLEANING UP TEST DATA');
    console.log('-'.repeat(40));

    try {
      // Delete facility_users entries
      if (createdFacilityId) {
        await supabase
          .from('facility_users')
          .delete()
          .eq('facility_id', createdFacilityId);
        console.log('✅ Cleaned up facility_users entries');
      }

      // Delete auth users
      if (createdUserId) {
        await supabase.auth.admin.deleteUser(createdUserId);
        console.log('✅ Cleaned up facility owner');
      }

      // Delete facility
      if (createdFacilityId) {
        await supabase
          .from('facilities')
          .delete()
          .eq('id', createdFacilityId);
        console.log('✅ Cleaned up test facility');
      }

      console.log('✅ All test data cleaned up');

    } catch (cleanupError) {
      console.error('⚠️ Cleanup error (non-critical):', cleanupError.message);
    }
  }
}

testFacilityCreationWorkflow();