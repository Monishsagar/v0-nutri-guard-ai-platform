"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { 
  Utensils, 
  Camera, 
  Target, 
  Flame, 
  Droplets,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Loader2
} from "lucide-react"

interface DietPlan {
  plan_json: {
    breakfast: { name: string; totalCalories: number }
    lunch: { name: string; totalCalories: number }
    dinner: { name: string; totalCalories: number }
    snacks: Array<{ name: string; calories: number }>
    dailySummary: {
      totalCalories: number
      protein: number
      carbs: number
      fat: number
    }
  }
  caloric_target: number
}

interface MealLog {
  meal_slot: string
  total_nutrition: {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
  }
  deviation_class: string
}

export default function DashboardPage() {
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [todayMeals, setTodayMeals] = useState<MealLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push("/auth/login")
        return
      }

      // Check onboarding status
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_step")
        .eq("id", user.id)
        .single()

      if (profile && profile.onboarding_step < 3) {
        router.push("/onboarding")
        return
      }

      // Fetch diet plan
      const { data: plan } = await supabase
        .from("diet_plans")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .single()

      if (plan) {
        setDietPlan(plan)
      }

      // Fetch today's meals
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data: meals } = await supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", user.id)
        .gte("logged_at", today.toISOString())
        .order("logged_at", { ascending: true })

      if (meals) {
        setTodayMeals(meals)
      }

      setIsLoading(false)
    }

    fetchData()
  }, [router, supabase])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Calculate today's progress
  const consumedCalories = todayMeals.reduce(
    (sum, meal) => sum + (meal.total_nutrition?.calories || 0), 
    0
  )
  const targetCalories = dietPlan?.caloric_target || 2000
  const calorieProgress = Math.min((consumedCalories / targetCalories) * 100, 100)

  const consumedProtein = todayMeals.reduce(
    (sum, meal) => sum + (meal.total_nutrition?.protein || 0), 
    0
  )
  const targetProtein = dietPlan?.plan_json?.dailySummary?.protein || 60
  const proteinProgress = Math.min((consumedProtein / targetProtein) * 100, 100)

  const consumedCarbs = todayMeals.reduce(
    (sum, meal) => sum + (meal.total_nutrition?.carbs || 0), 
    0
  )
  const targetCarbs = dietPlan?.plan_json?.dailySummary?.carbs || 250
  const carbsProgress = Math.min((consumedCarbs / targetCarbs) * 100, 100)

  const consumedFat = todayMeals.reduce(
    (sum, meal) => sum + (meal.total_nutrition?.fat || 0), 
    0
  )
  const targetFat = dietPlan?.plan_json?.dailySummary?.fat || 65
  const fatProgress = Math.min((consumedFat / targetFat) * 100, 100)

  const loggedMealSlots = todayMeals.map(m => m.meal_slot)
  const mealSlots = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"]

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Calories Today
            </CardTitle>
            <Flame className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {consumedCalories}
              <span className="text-sm font-normal text-muted-foreground">
                {" "}/ {targetCalories} kcal
              </span>
            </div>
            <Progress value={calorieProgress} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Protein
            </CardTitle>
            <Target className="h-4 w-4 text-chart-1" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {consumedProtein}g
              <span className="text-sm font-normal text-muted-foreground">
                {" "}/ {targetProtein}g
              </span>
            </div>
            <Progress value={proteinProgress} className="mt-2 h-2 [&>div]:bg-chart-1" />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Carbs
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-chart-2" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {consumedCarbs}g
              <span className="text-sm font-normal text-muted-foreground">
                {" "}/ {targetCarbs}g
              </span>
            </div>
            <Progress value={carbsProgress} className="mt-2 h-2 [&>div]:bg-chart-2" />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fat
            </CardTitle>
            <Droplets className="h-4 w-4 text-chart-3" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {consumedFat}g
              <span className="text-sm font-normal text-muted-foreground">
                {" "}/ {targetFat}g
              </span>
            </div>
            <Progress value={fatProgress} className="mt-2 h-2 [&>div]:bg-chart-3" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Meal Status */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground">Today&apos;s Meals</CardTitle>
            <CardDescription className="text-muted-foreground">Track your meals throughout the day</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mealSlots.map((slot) => {
              const isLogged = loggedMealSlots.includes(slot)
              const meal = todayMeals.find(m => m.meal_slot === slot)
              const mealName = dietPlan?.plan_json?.[slot.toLowerCase() as keyof typeof dietPlan.plan_json]
              
              return (
                <div
                  key={slot}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3">
                    {isLogged ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted">
                        <Utensils className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-foreground capitalize">
                        {slot.toLowerCase()}
                      </p>
                      {isLogged && meal?.total_nutrition?.calories ? (
                        <p className="text-sm text-muted-foreground">
                          {meal.total_nutrition.calories} kcal
                          {meal.deviation_class && meal.deviation_class !== "PERFECT" && (
                            <span className={`ml-2 ${
                              meal.deviation_class === "MAJOR" 
                                ? "text-destructive" 
                                : "text-amber-500"
                            }`}>
                              ({meal.deviation_class.toLowerCase()} deviation)
                            </span>
                          )}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Not logged yet</p>
                      )}
                    </div>
                  </div>
                  {!isLogged && (
                    <Link href={`/dashboard/log-meal?slot=${slot}`}>
                      <Button size="sm" variant="outline">
                        <Camera className="h-4 w-4 mr-1" />
                        Log
                      </Button>
                    </Link>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Diet Plan Preview */}
        <Card className="bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-foreground">Your Diet Plan</CardTitle>
              <CardDescription className="text-muted-foreground">AI-generated personalized meals</CardDescription>
            </div>
            <Link href="/dashboard/diet-plan">
              <Button variant="outline" size="sm">
                View Full Plan
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {dietPlan?.plan_json ? (
              <>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Breakfast</span>
                    <span className="text-sm text-muted-foreground">
                      {dietPlan.plan_json.breakfast?.totalCalories || 0} kcal
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-foreground">
                    {dietPlan.plan_json.breakfast?.name || "Not set"}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Lunch</span>
                    <span className="text-sm text-muted-foreground">
                      {dietPlan.plan_json.lunch?.totalCalories || 0} kcal
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-foreground">
                    {dietPlan.plan_json.lunch?.name || "Not set"}
                  </p>
                </div>
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">Dinner</span>
                    <span className="text-sm text-muted-foreground">
                      {dietPlan.plan_json.dinner?.totalCalories || 0} kcal
                    </span>
                  </div>
                  <p className="mt-1 font-medium text-foreground">
                    {dietPlan.plan_json.dinner?.name || "Not set"}
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No diet plan found</p>
                <Link href="/onboarding">
                  <Button className="mt-4">Complete Onboarding</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card">
        <CardHeader>
          <CardTitle className="text-foreground">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/dashboard/log-meal">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Camera className="h-6 w-6 text-primary" />
                <span>Log a Meal</span>
              </Button>
            </Link>
            <Link href="/dashboard/diet-plan">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <Utensils className="h-6 w-6 text-primary" />
                <span>View Diet Plan</span>
              </Button>
            </Link>
            <Link href="/dashboard/progress">
              <Button variant="outline" className="w-full h-auto py-4 flex-col gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <span>View Progress</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
