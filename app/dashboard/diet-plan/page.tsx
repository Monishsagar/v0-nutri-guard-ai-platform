"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Utensils, 
  Flame, 
  Loader2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Coffee,
  Sun,
  Moon,
  Cookie
} from "lucide-react"

interface MealItem {
  food: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Meal {
  name: string
  description: string
  items: MealItem[]
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
}

interface Snack {
  name: string
  calories: number
  description: string
}

interface DietPlan {
  id: string
  plan_json: {
    breakfast: Meal
    lunch: Meal
    dinner: Meal
    snacks: Snack[]
    dailySummary: {
      totalCalories: number
      protein: number
      carbs: number
      fat: number
      fiber: number
    }
    recommendations: string[]
    avoidFoods: string[]
  }
  caloric_target: number
  generated_at: string
}

export default function DietPlanPage() {
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchDietPlan()
  }, [])

  const fetchDietPlan = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push("/auth/login")
      return
    }

    const { data: plan } = await supabase
      .from("diet_plans")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .single()

    if (plan) {
      setDietPlan(plan)
    }

    setIsLoading(false)
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const response = await fetch("/api/generate-diet-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      })

      if (response.ok) {
        await fetchDietPlan()
      }
    } catch (error) {
      console.error("Error regenerating plan:", error)
    } finally {
      setIsRegenerating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!dietPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No Diet Plan Found</h2>
        <p className="text-muted-foreground mb-6">Complete the onboarding to generate your personalized plan</p>
        <Button onClick={() => router.push("/onboarding")}>
          Complete Onboarding
        </Button>
      </div>
    )
  }

  const { plan_json: plan, caloric_target } = dietPlan

  const MealCard = ({ 
    meal, 
    icon: Icon, 
    title 
  }: { 
    meal: Meal
    icon: React.ElementType
    title: string 
  }) => (
    <Card className="bg-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">{title}</CardTitle>
              <CardDescription className="text-muted-foreground">{meal.name}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {meal.totalCalories} kcal
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{meal.description}</p>
        
        <div className="space-y-2">
          {meal.items.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
            >
              <div>
                <p className="font-medium text-foreground">{item.food}</p>
                <p className="text-sm text-muted-foreground">{item.portion}</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-medium text-foreground">{item.calories} kcal</p>
                <p className="text-muted-foreground">
                  P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2 border-t text-sm">
          <span className="text-muted-foreground">Total Macros:</span>
          <span className="font-medium text-foreground">
            P: {meal.totalProtein}g | C: {meal.totalCarbs}g | F: {meal.totalFat}g
          </span>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Your Diet Plan</h1>
          <p className="text-muted-foreground">
            Generated on {new Date(dietPlan.generated_at).toLocaleDateString()}
          </p>
        </div>
        <Button 
          onClick={handleRegenerate} 
          disabled={isRegenerating}
          variant="outline"
        >
          {isRegenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Regenerating...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate Plan
            </>
          )}
        </Button>
      </div>

      {/* Daily Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-foreground">Daily Summary</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 rounded-lg bg-background">
              <Flame className="h-5 w-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{caloric_target}</p>
              <p className="text-sm text-muted-foreground">Calories</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background">
              <p className="text-2xl font-bold text-foreground">{plan.dailySummary.protein}g</p>
              <p className="text-sm text-muted-foreground">Protein</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background">
              <p className="text-2xl font-bold text-foreground">{plan.dailySummary.carbs}g</p>
              <p className="text-sm text-muted-foreground">Carbs</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background">
              <p className="text-2xl font-bold text-foreground">{plan.dailySummary.fat}g</p>
              <p className="text-sm text-muted-foreground">Fat</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-background">
              <p className="text-2xl font-bold text-foreground">{plan.dailySummary.fiber}g</p>
              <p className="text-sm text-muted-foreground">Fiber</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meals */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Meals</TabsTrigger>
          <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
          <TabsTrigger value="lunch">Lunch</TabsTrigger>
          <TabsTrigger value="dinner">Dinner</TabsTrigger>
          <TabsTrigger value="snacks">Snacks</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <MealCard meal={plan.breakfast} icon={Coffee} title="Breakfast" />
          <MealCard meal={plan.lunch} icon={Sun} title="Lunch" />
          <MealCard meal={plan.dinner} icon={Moon} title="Dinner" />
          
          {/* Snacks */}
          <Card className="bg-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-foreground">Snacks</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.snacks.map((snack, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                >
                  <div>
                    <p className="font-medium text-foreground">{snack.name}</p>
                    <p className="text-sm text-muted-foreground">{snack.description}</p>
                  </div>
                  <Badge variant="outline">{snack.calories} kcal</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="breakfast">
          <MealCard meal={plan.breakfast} icon={Coffee} title="Breakfast" />
        </TabsContent>

        <TabsContent value="lunch">
          <MealCard meal={plan.lunch} icon={Sun} title="Lunch" />
        </TabsContent>

        <TabsContent value="dinner">
          <MealCard meal={plan.dinner} icon={Moon} title="Dinner" />
        </TabsContent>

        <TabsContent value="snacks">
          <Card className="bg-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Cookie className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-foreground">Snacks</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {plan.snacks.map((snack, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                >
                  <div>
                    <p className="font-medium text-foreground">{snack.name}</p>
                    <p className="text-sm text-muted-foreground">{snack.description}</p>
                  </div>
                  <Badge variant="outline">{snack.calories} kcal</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendations */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Utensils className="h-5 w-5 text-primary" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {plan.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <span className="text-primary mt-1">•</span>
                  <span className="text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Foods to Avoid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {plan.avoidFoods.map((food, index) => (
                <Badge key={index} variant="destructive" className="bg-destructive/10 text-destructive">
                  {food}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
