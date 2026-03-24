"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardHeader() {
  const [userName, setUserName] = useState("")
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single()
        
        if (profile) {
          setUserName(profile.full_name)
        }
      }
    }
    getUser()
  }, [supabase])

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="sticky top-0 z-40 h-16 bg-background/95 backdrop-blur border-b flex items-center justify-between px-4 lg:px-6">
      <div className="lg:hidden w-10" /> {/* Spacer for mobile menu button */}
      
      <div className="flex-1 lg:ml-0">
        <h2 className="text-lg font-semibold text-foreground hidden sm:block">
          Welcome back{userName ? `, ${userName.split(" ")[0]}` : ""}
        </h2>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        
        <Avatar className="h-9 w-9">
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {userName ? getInitials(userName) : "U"}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  )
}
