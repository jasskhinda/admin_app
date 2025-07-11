'use client';

import { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function TestFacilitiesSimple() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testInsert = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      // Try to insert minimal data
      const { data, error } = await supabase
        .from('facilities')
        .insert([{
          name: 'Test Facility',
          address: 'Test Address',
          phone_number: '555-1234',
          contact_email: 'test@test.com'
        }])
        .select()
        .single();
        
      if (error) {
        setResult(`ERROR: ${error.message}`);
      } else {
        setResult(`SUCCESS: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setResult(`EXCEPTION: ${err.message}`);
    }
    setLoading(false);
  };

  const testSelect = async () => {
    setLoading(true);
    const supabase = createClient();
    
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .limit(1);
        
      if (error) {
        setResult(`SELECT ERROR: ${error.message}`);
      } else {
        setResult(`SELECT SUCCESS: ${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      setResult(`SELECT EXCEPTION: ${err.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl mb-4">Test Facilities Table</h1>
      
      <div className="space-x-4 mb-6">
        <button 
          onClick={testSelect}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Test SELECT
        </button>
        <button 
          onClick={testInsert}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded disabled:opacity-50"
        >
          Test INSERT
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded">
        <h2>Result:</h2>
        <pre className="whitespace-pre-wrap">{result || 'Click a button to test'}</pre>
      </div>
    </div>
  );
}