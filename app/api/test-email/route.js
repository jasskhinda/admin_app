import { NextResponse } from 'next/server';
import { sendDriverAssignmentEmail } from '@/lib/emailService';

export async function POST(request) {
  try {
    const { driverEmail } = await request.json();
    
    if (!driverEmail) {
      return NextResponse.json({ error: 'Driver email is required' }, { status: 400 });
    }

    console.log('🧪 Testing email service with:', driverEmail);

    // Test data
    const driverInfo = {
      first_name: 'Test',
      last_name: 'Driver',
      email: driverEmail
    };

    const tripInfo = {
      pickup_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
      pickup_location: '123 Test Pickup Street, Test City',
      dropoff_location: '456 Test Destination Ave, Test City',
      client_name: 'Test Client',
      client_phone: '(555) 123-4567',
      special_instructions: 'This is a test email notification',
      total_cost: '25.00',
      is_emergency: false
    };

    // Use a more realistic UUID format for testing
    const testTripId = '2d2a978c-3abc-45b3-95b8-345ad5e254fa';

    const result = await sendDriverAssignmentEmail(driverInfo, tripInfo, testTripId);

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
      recipient: result.recipient
    });

  } catch (error) {
    console.error('❌ Test email failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 });
  }
}