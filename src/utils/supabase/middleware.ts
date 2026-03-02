import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /dashboard routes strictly
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      // Not logged in, redirect immediately to login page
      const redirectUrl = new URL('/login', request.url)
      // redirectUrl.searchParams.set('redirectedFrom', request.nextUrl.pathname) // Optional: for UX
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect logged in user from /login back to their dashboard
  if (request.nextUrl.pathname === '/login' && user) {
    // Need to fetch role to redirect appropriately, 
    // however fetching DB inside middleware is generally slow, 
    // we can redirect to a dispatcher or just admin temporarily if we don't have role.
    // Better approach: Redirect to a general /dashboard and let a server component handle the role-based dispatch,
    // But user requested /dashboard/admin and /dashboard/awardee. 
    // So we will just redirect to a generic /dashboard which will handle the dispatching.
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}