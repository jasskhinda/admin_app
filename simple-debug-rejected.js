#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables:');
  console.error('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_ROLE_KEY:', !!serviceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runSimpleDebug() {
  console.log('🔍 Running simple debugging for rejected trips...\n');

  try {
    // Step 1: Try to get rejected trips without the problematic column first
    console.log('1. Checking rejected trips (basic columns)...');
    const { data: rejectedTrips, error: rejectedError } = await supabase
      .from('trips')
      .select('id, status, driver_id, created_at, pickup_address, destination_address')
      .eq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (rejectedError) {
      console.error('Error fetching rejected trips:', rejectedError);
    } else {
      console.log(`Found ${rejectedTrips?.length || 0} rejected trips:`);
      if (rejectedTrips && rejectedTrips.length > 0) {
        rejectedTrips.forEach((trip, index) => {
          console.log(`\nRejected Trip ${index + 1}:`);
          console.log(`  ID: ${trip.id}`);
          console.log(`  Status: ${trip.status}`);
          console.log(`  Driver ID: ${trip.driver_id || 'None assigned'}`);
          console.log(`  Created: ${trip.created_at}`);
          console.log(`  From: ${trip.pickup_address}`);
          console.log(`  To: ${trip.destination_address}`);
        });
      }
    }

    // Step 2: Check all trip statuses
    console.log('\n2. Checking all trip statuses and counts...');
    const { data: allTrips, error: allTripsError } = await supabase
      .from('trips')
      .select('status')
      .not('status', 'is', null);

    if (allTripsError) {
      console.error('Error fetching all trips:', allTripsError);
    } else {
      const statusCounts = allTrips.reduce((acc, trip) => {
        acc[trip.status] = (acc[trip.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('Trip counts by status:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }

    // Step 3: Get a sample of trip columns to see structure
    console.log('\n3. Checking available columns in trips table...');
    const { data: sampleTrip, error: sampleError } = await supabase
      .from('trips')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('Error fetching sample trip:', sampleError);
    } else if (sampleTrip && sampleTrip.length > 0) {
      console.log('Available columns in trips table:');
      Object.keys(sampleTrip[0]).forEach(column => {
        console.log(`  - ${column}`);
      });
      
      // Check if rejected_by_driver_id exists
      if (sampleTrip[0].hasOwnProperty('rejected_by_driver_id')) {
        console.log('\n✅ rejected_by_driver_id column exists!');
      } else {
        console.log('\n❌ rejected_by_driver_id column does NOT exist');
        console.log('   You need to run the SQL script to add it:');
        console.log('   Use the add-rejected-column.sql file in your Supabase SQL editor');
      }
    }

    // Step 4: If we have rejected trips, try to get more details
    if (rejectedTrips && rejectedTrips.length > 0) {
      console.log('\n4. Getting more details about rejected trips...');
      
      for (const trip of rejectedTrips) {
        console.log(`\n--- Trip ${trip.id} Details ---`);
        
        // Get full trip details
        const { data: fullTrip, error: fullTripError } = await supabase
          .from('trips')
          .select('*')
          .eq('id', trip.id)
          .single();

        if (fullTripError) {
          console.error(`Error fetching full details for trip ${trip.id}:`, fullTripError);
        } else {
          console.log(`Full trip data:`, fullTrip);
        }
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the debug script
runSimpleDebug()
  .then(() => {
    console.log('\n✅ Simple debug completed');
    console.log('\n📋 Summary:');
    console.log('- You have rejected trips in your database');
    console.log('- The rejected_by_driver_id column likely needs to be added');
    console.log('- Run add-rejected-column.sql in your Supabase dashboard to add the missing column');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });