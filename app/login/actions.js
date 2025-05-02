'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export async function login(formData) {
  const email = formData.get('email')
  const password = formData.get('password')

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  // Try to sign in with provided credentials
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', (await supabase.auth.getUser()).data.user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    // Sign out if not an admin
    await supabase.auth.signOut()
    return { error: 'Access denied. Admin only.' }
  }

  // Redirect to dashboard on successful login
  redirect('/dashboard')
}

export async function signup(formData) {
  const email = formData.get('email')
  const password = formData.get('password')

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  // Sign up with provided credentials
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    }
  })

  if (error) {
    return { error: error.message }
  }

  // Redirect to confirmation page
  redirect('/login?message=Check+your+email+for+a+confirmation+link')
}