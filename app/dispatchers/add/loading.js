export default function Loading() {
  return (
    <div className="min-h-screen">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="h-6 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
          
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="h-5 bg-gray-200 rounded w-40 mb-4 animate-pulse"></div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>
                
                <div>
                  <div className="h-4 bg-gray-200 rounded w-20 mb-1 animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
                </div>
              </div>

              <div className="mt-4">
                <div className="h-4 bg-gray-200 rounded w-12 mb-1 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>

              <div className="mt-4">
                <div className="h-4 bg-gray-200 rounded w-24 mb-1 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-full animate-pulse"></div>
              </div>
            </div>

            <div className="flex justify-end">
              <div className="h-10 bg-gray-200 rounded w-20 mr-3 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}