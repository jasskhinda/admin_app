import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Check if facilities table exists and get structure
    const { data: facilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select('*')
      .limit(10);
    
    // Get table info
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'facilities')
      .eq('table_schema', 'public');
    
    return NextResponse.json({
      success: true,
      facilities_count: facilities?.length || 0,
      facilities: facilities || [],
      facilities_error: facilitiesError,
      table_columns: tableInfo || [],
      table_error: tableError
    });
    
  } catch (error) {
    console.error('Debug facilities error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}