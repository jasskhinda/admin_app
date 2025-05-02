import Link from 'next/link'

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
      <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">Authentication Error</h1>
        
        <p className="mb-6 text-gray-700 dark:text-gray-300">
          There was a problem processing your authentication request. This could be due to:
        </p>
        
        <ul className="list-disc text-left mb-6 text-gray-700 dark:text-gray-300 ml-8">
          <li>An expired or invalid authentication link</li>
          <li>A link that has already been used</li>
          <li>A session that has timed out</li>
        </ul>
        
        <p className="mb-8 text-gray-700 dark:text-gray-300">
          Please try signing in again or contact support if the problem persists.
        </p>
        
        <Link 
          href="/login" 
          className="px-4 py-2 bg-brand-accent text-brand-buttonText dark:text-brand-background rounded focus:outline-none hover:bg-opacity-90"
        >
          Return to Login
        </Link>
      </div>
    </div>
  )
}