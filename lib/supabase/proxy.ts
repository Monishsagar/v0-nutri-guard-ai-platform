import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/auth/login', '/auth/sign-up', '/auth/sign-up-success', '/auth/error', '/auth/forgot-password', '/auth/reset-password']
  const isPublicRoute = publicRoutes.some(route => request.nextUrl.pathname === route)

  // If user is not logged in and trying to access protected routes
  if (!user && !isPublicRoute && !request.nextUrl.pathname.startsWith('/auth')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  // If user is logged in, check onboarding status for diet users
  if (user && !isPublicRoute && !request.nextUrl.pathname.startsWith('/auth') && !request.nextUrl.pathname.startsWith('/onboarding')) {
    // Get user profile to check role and onboarding status
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_step')
      .eq('id', user.id)
      .single()

    // If diet user hasn't completed onboarding, redirect to onboarding
    if (profile?.role === 'DIET_USER' && profile?.onboarding_step < 2) {
      const url = request.nextUrl.clone()
      if (profile.onboarding_step === 0) {
        url.pathname = '/onboarding/medical-report'
      } else if (profile.onboarding_step === 1) {
        url.pathname = '/onboarding/health-survey'
      }
      return NextResponse.redirect(url)
    }
  }

  // Redirect logged in users away from auth pages
  if (user && (request.nextUrl.pathname.startsWith('/auth/login') || request.nextUrl.pathname.startsWith('/auth/sign-up'))) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, onboarding_step')
      .eq('id', user.id)
      .single()

    const url = request.nextUrl.clone()
    
    // Check if diet user needs to complete onboarding
    if (profile?.role === 'DIET_USER' && profile?.onboarding_step < 2) {
      if (profile.onboarding_step === 0) {
        url.pathname = '/onboarding/medical-report'
      } else {
        url.pathname = '/onboarding/health-survey'
      }
    } else {
      url.pathname = profile?.role === 'GUIDE' ? '/guide/dashboard' : '/dashboard'
    }
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
