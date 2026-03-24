import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.user) {
      // Check user role to determine redirect
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, onboarding_step")
        .eq("id", data.user.id)
        .single()

      if (profile) {
        if (profile.role === "GUIDE") {
          return NextResponse.redirect(`${origin}/guide/dashboard`)
        } else {
          // Check if onboarding is complete
          if (profile.onboarding_step < 3) {
            return NextResponse.redirect(`${origin}/onboarding`)
          } else {
            return NextResponse.redirect(`${origin}/dashboard`)
          }
        }
      }
    }
  }

  // Redirect to login on error
  return NextResponse.redirect(`${origin}/auth/login`)
}
