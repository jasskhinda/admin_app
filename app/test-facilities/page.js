import { createClient } from '@/utils/supabase/server';

export default async function TestFacilitiesPage() {
  const supabase = await createClient();
  
  try {
    // Test the facilities table structure
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .limit(1);
      
    if (error) {
      return (
        <div className="p-4">
          <h1>Facilities Table Test</h1>
          <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
            <h2>Error:</h2>
            <pre>{JSON.stringify(error, null, 2)}</pre>
          </div>
        </div>
      );
    }
    
    return (
      <div className="p-4">
        <h1>Facilities Table Test</h1>
        <div className="mt-4 p-4 bg-green-100 border border-green-400 rounded">
          <h2>Success! Sample data:</h2>
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
        
        <div className="mt-4">
          <h2>Available columns (if any data exists):</h2>
          {data && data.length > 0 ? (
            <ul>
              {Object.keys(data[0]).map(key => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          ) : (
            <p>No data found to determine columns</p>
          )}
        </div>
      </div>
    );
  } catch (err) {
    return (
      <div className="p-4">
        <h1>Facilities Table Test</h1>
        <div className="mt-4 p-4 bg-red-100 border border-red-400 rounded">
          <h2>Caught Error:</h2>
          <pre>{JSON.stringify(err, null, 2)}</pre>
        </div>
      </div>
    );
  }
}