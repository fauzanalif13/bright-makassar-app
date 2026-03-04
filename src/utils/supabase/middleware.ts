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

  // Wrap getUser() to handle stale/invalid refresh tokens gracefully
  let user = null
  try {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      // Invalid refresh token — clear all Supabase auth cookies
      const redirectUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(redirectUrl)
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.delete(cookie.name)
        }
      })
      // Only redirect if on a protected route; on public pages just continue
      if (request.nextUrl.pathname.startsWith('/dashboard')) {
        return response
      }
      // For public pages, just continue without a user
    } else {
      user = data.user
    }
  } catch {
    // Fallback: any unexpected auth error — redirect to login on protected routes
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      const redirectUrl = new URL('/login', request.url)
      const response = NextResponse.redirect(redirectUrl)
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.startsWith('sb-')) {
          response.cookies.delete(cookie.name)
        }
      })
      return response
    }
  }

  // Protect /dashboard routes strictly
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Redirect logged in user from /login back to their dashboard
  if (request.nextUrl.pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}