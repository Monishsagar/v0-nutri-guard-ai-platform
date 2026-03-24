"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Shield, Check } from "lucide-react"
import { ReportUploadStep } from "@/components/onboarding/report-upload-step"
import { HealthSurveyStep } from "@/components/onboarding/health-survey-step"
import { ReviewStep } from "@/components/onboarding/review-step"

const steps = [
  { id: 1, name: "Medical Report", description: "Upload your blood test results" },
  { id: 2, name: "Health Survey", description: "Tell us about your lifestyle" },
  { id: 3, name: "Review", description: "Confirm your information" },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/auth/login")
        return
      }

      setUserId(user.id)

      // Get current onboarding step
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_step, role")
        .eq("id", user.id)
        .single()

      if (profile) {
        if (profile.role === "GUIDE") {
          router.push("/guide/dashboard")
          return
        }
        if (profile.onboarding_step >= 3) {
          router.push("/dashboard")
          return
        }
        setCurrentStep(profile.onboarding_step + 1)
      }

      setIsLoading(false)
    }

    checkAuth()
  }, [router, supabase])

  const handleStepComplete = async (step: number) => {
    if (!userId) return

    // Update onboarding step in profile
    await supabase
      .from("profiles")
      .update({ onboarding_step: step, updated_at: new Date().toISOString() })
      .eq("id", userId)

    if (step >= 3) {
      router.push("/dashboard")
    } else {
      setCurrentStep(step + 1)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary animate-pulse">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">NutriGuard AI</span>
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome! Let&apos;s Set Up Your Profile</h1>
          <p className="text-muted-foreground">Complete these steps to get your personalized diet plan</p>
        </div>

        {/* Progress Steps */}
        <div className="max-w-3xl mx-auto mb-12">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-center">
              {steps.map((step, stepIdx) => (
                <li key={step.name} className={`relative ${stepIdx !== steps.length - 1 ? "pr-8 sm:pr-20" : ""}`}>
                  <div className="flex items-center">
                    <div
                      className={`relative flex h-10 w-10 items-center justify-center rounded-full ${
                        step.id < currentStep
                          ? "bg-primary"
                          : step.id === currentStep
                          ? "border-2 border-primary bg-background"
                          : "border-2 border-muted bg-background"
                      }`}
                    >
                      {step.id < currentStep ? (
                        <Check className="h-5 w-5 text-primary-foreground" />
                      ) : (
                        <span className={`text-sm font-medium ${
                          step.id === currentStep ? "text-primary" : "text-muted-foreground"
                        }`}>
                          {step.id}
                        </span>
                      )}
                    </div>
                    {stepIdx !== steps.length - 1 && (
                      <div
                        className={`absolute left-10 top-5 h-0.5 w-8 sm:w-20 ${
                          step.id < currentStep ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    )}
                  </div>
                  <div className="mt-2 hidden sm:block">
                    <p className={`text-sm font-medium ${
                      step.id <= currentStep ? "text-foreground" : "text-muted-foreground"
                    }`}>
                      {step.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Step Content */}
        <div className="max-w-2xl mx-auto">
          {currentStep === 1 && userId && (
            <ReportUploadStep userId={userId} onComplete={() => handleStepComplete(1)} />
          )}
          {currentStep === 2 && userId && (
            <HealthSurveyStep userId={userId} onComplete={() => handleStepComplete(2)} />
          )}
          {currentStep === 3 && userId && (
            <ReviewStep userId={userId} onComplete={() => handleStepComplete(3)} />
          )}
        </div>
      </div>
    </div>
  )
}
