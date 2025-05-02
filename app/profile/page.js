import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { signOut } from '@/app/auth/actions'

export default async function ProfilePage() {
  const supabase = await createClient()
  
  // Get the user and verify authentication
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect('/login')
  }
  
  // Fetch the user's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  // Check if user is an admin
  if (!profile || profile.role !== 'admin') {
    redirect('/login?error=Admin%20access%20required')
  }
  
  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">User Profile</h1>
      
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Account Information</h2>
          <p className="mb-1"><span className="font-medium">Email:</span> {user.email}</p>
          <p className="mb-1"><span className="font-medium">Role:</span> {profile?.role || 'Unknown'}</p>
          <p className="mb-1"><span className="font-medium">Last Sign In:</span> {new Date(user.last_sign_in_at).toLocaleString()}</p>
        </div>
        
        <div className="mb-4">
          <h2 className="text-xl font-semibold mb-2">Profile Details</h2>
          {profile ? (
            <>
              <p className="mb-1"><span className="font-medium">Full Name:</span> {profile.full_name || 'Not provided'}</p>
              <p className="mb-1"><span className="font-medium">Status:</span> {profile.status || 'Active'}</p>
              {/* Add any other profile fields you want to display */}
            </>
          ) : (
            <p>No profile information available</p>
          )}
        </div>
        
        <form action={signOut}>
          <button
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
            type="submit"
          >
            Sign Out
          </button>
        </form>
      </div>
    </div>
  )
}