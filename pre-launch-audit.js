require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function preLaunchAudit() {
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

    console.log('🚀 PRE-LAUNCH AUDIT - Compassionate Care Transportation');
    console.log('='.repeat(60));
    console.log();

    let issues = [];
    let warnings = [];

    try {
        // 1. Check Admin Users
        console.log('1️⃣ ADMIN USERS AUDIT');
        console.log('-'.repeat(30));

        const { data: adminUsers, error: adminError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'admin');

        if (adminError) {
            issues.push('❌ Cannot query admin users: ' + adminError.message);
        } else {
            console.log(`✅ Found ${adminUsers.length} admin users:`);
            adminUsers.forEach(admin => {
                console.log(`   - ${admin.email} (${admin.full_name || 'No name'})`);
            });

            if (adminUsers.length === 0) {
                issues.push('❌ No admin users found - system needs at least one admin');
            }
        }
        console.log();

        // 2. Check Facility Users
        console.log('2️⃣ FACILITY USERS AUDIT');
        console.log('-'.repeat(30));

        const { data: facilityUsers, error: facilityError } = await supabase
            .from('profiles')
            .select('*')
            .eq('role', 'facility');

        if (facilityError) {
            issues.push('❌ Cannot query facility users: ' + facilityError.message);
        } else {
            console.log(`✅ Found ${facilityUsers.length} facility users:`);

            for (const facility of facilityUsers) {
                console.log(`   - ${facility.email} (${facility.full_name || 'No name'})`);

                // Check if they have facility_users entry
                const { data: facilityUserEntry, error: fuError } = await supabase
                    .from('facility_users')
                    .select('*')
                    .eq('user_id', facility.id)
                    .single();

                if (fuError || !facilityUserEntry) {
                    issues.push(`❌ ${facility.email} missing facility_users entry`);
                } else {
                    console.log(`     ✅ Has facility_users entry: ${facilityUserEntry.role} (Owner: ${facilityUserEntry.is_owner})`);
                }

                // Check if their facility exists
                if (facility.facility_id) {
                    const { data: facilityRecord, error: frError } = await supabase
                        .from('facilities')
                        .select('name')
                        .eq('id', facility.facility_id)
                        .single();

                    if (frError || !facilityRecord) {
                        issues.push(`❌ ${facility.email} references non-existent facility: ${facility.facility_id}`);
                    } else {
                        console.log(`     ✅ Facility exists: ${facilityRecord.name}`);
                    }
                } else {
                    issues.push(`❌ ${facility.email} has no facility_id assigned`);
                }
            }
        }
        console.log();

        // 3. Check Facilities
        console.log('3️⃣ FACILITIES AUDIT');
        console.log('-'.repeat(30));

        const { data: facilities, error: facilitiesError } = await supabase
            .from('facilities')
            .select('*');

        if (facilitiesError) {
            issues.push('❌ Cannot query facilities: ' + facilitiesError.message);
        } else {
            console.log(`✅ Found ${facilities.length} facilities:`);

            for (const facility of facilities) {
                console.log(`   - ${facility.name} (ID: ${facility.id.substring(0, 8)}...)`);

                // Check if facility has an owner
                const { data: owners, error: ownersError } = await supabase
                    .from('facility_users')
                    .select('user_id, is_owner')
                    .eq('facility_id', facility.id)
                    .eq('is_owner', true)
                    .eq('status', 'active');

                if (ownersError) {
                    warnings.push(`⚠️ Cannot check owners for ${facility.name}: ${ownersError.message}`);
                } else if (owners.length === 0) {
                    issues.push(`❌ ${facility.name} has no owner assigned`);
                } else if (owners.length > 1) {
                    issues.push(`❌ ${facility.name} has multiple owners (${owners.length})`);
                } else {
                    console.log(`     ✅ Has owner: ${owners[0].user_id.substring(0, 8)}...`);
                }

                // Check required fields
                const requiredFields = ['name', 'address', 'contact_email'];
                const missingFields = requiredFields.filter(field => !facility[field]);
                if (missingFields.length > 0) {
                    warnings.push(`⚠️ ${facility.name} missing fields: ${missingFields.join(', ')}`);
                }
            }
        }
        console.log();

        // 4. Check Database Integrity
        console.log('4️⃣ DATABASE INTEGRITY AUDIT');
        console.log('-'.repeat(30));

        // Check for orphaned facility_users
        const { data: orphanedFacilityUsers, error: orphanError } = await supabase
            .from('facility_users')
            .select(`
        user_id,
        facility_id,
        profiles!inner(email)
      `)
            .is('profiles.id', null);

        if (orphanError) {
            warnings.push('⚠️ Cannot check for orphaned facility_users: ' + orphanError.message);
        } else if (orphanedFacilityUsers && orphanedFacilityUsers.length > 0) {
            issues.push(`❌ Found ${orphanedFacilityUsers.length} orphaned facility_users entries`);
        } else {
            console.log('✅ No orphaned facility_users entries found');
        }

        // Check for duplicate facility owners
        const { data: duplicateOwners, error: dupError } = await supabase
            .from('facility_users')
            .select('facility_id')
            .eq('is_owner', true)
            .eq('status', 'active');

        if (dupError) {
            warnings.push('⚠️ Cannot check for duplicate owners: ' + dupError.message);
        } else {
            const facilityOwnerCounts = {};
            duplicateOwners.forEach(owner => {
                facilityOwnerCounts[owner.facility_id] = (facilityOwnerCounts[owner.facility_id] || 0) + 1;
            });

            const duplicates = Object.entries(facilityOwnerCounts).filter(([_, count]) => count > 1);
            if (duplicates.length > 0) {
                issues.push(`❌ Found facilities with multiple owners: ${duplicates.length}`);
            } else {
                console.log('✅ No duplicate facility owners found');
            }
        }
        console.log();

        // 5. Check API Endpoints
        console.log('5️⃣ CRITICAL API ENDPOINTS');
        console.log('-'.repeat(30));

        const criticalEndpoints = [
            'app/api/create-facility/route.js',
            'app/api/create-facility-owner/route.js',
            'app/api/admin/facilities-management/route.js',
            'app/api/admin/users-management/route.js'
        ];

        const fs = require('fs');
        const path = require('path');

        criticalEndpoints.forEach(endpoint => {
            const fullPath = path.join(__dirname, endpoint);
            if (fs.existsSync(fullPath)) {
                console.log(`✅ ${endpoint} exists`);
            } else {
                issues.push(`❌ Missing critical endpoint: ${endpoint}`);
            }
        });
        console.log();

        // 6. Environment Variables Check
        console.log('6️⃣ ENVIRONMENT VARIABLES');
        console.log('-'.repeat(30));

        const requiredEnvVars = [
            'NEXT_PUBLIC_SUPABASE_URL',
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'SUPABASE_SERVICE_ROLE_KEY'
        ];

        requiredEnvVars.forEach(envVar => {
            if (process.env[envVar]) {
                console.log(`✅ ${envVar} is set`);
            } else {
                issues.push(`❌ Missing environment variable: ${envVar}`);
            }
        });
        console.log();

        // SUMMARY
        console.log('📊 AUDIT SUMMARY');
        console.log('='.repeat(60));

        if (issues.length === 0 && warnings.length === 0) {
            console.log('🎉 ALL SYSTEMS GO! Ready for launch! 🚀');
        } else {
            if (issues.length > 0) {
                console.log(`❌ CRITICAL ISSUES (${issues.length}):`);
                issues.forEach(issue => console.log(`   ${issue}`));
                console.log();
            }

            if (warnings.length > 0) {
                console.log(`⚠️ WARNINGS (${warnings.length}):`);
                warnings.forEach(warning => console.log(`   ${warning}`));
                console.log();
            }

            if (issues.length > 0) {
                console.log('🛑 LAUNCH BLOCKED - Fix critical issues before going live');
            } else {
                console.log('⚠️ LAUNCH WITH CAUTION - Address warnings when possible');
            }
        }

    } catch (error) {
        console.error('💥 AUDIT FAILED:', error);
        issues.push('❌ Audit script failed: ' + error.message);
    }
}

preLaunchAudit();