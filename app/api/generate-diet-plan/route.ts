import { generateText, Output } from "ai"
import { createClient } from "@/lib/supabase/server"
import { z } from "zod"

const MealSchema = z.object({
  name: z.string(),
  description: z.string(),
  items: z.array(z.object({
    food: z.string(),
    portion: z.string(),
    calories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
  })),
  totalCalories: z.number(),
  totalProtein: z.number(),
  totalCarbs: z.number(),
  totalFat: z.number(),
})

const DietPlanSchema = z.object({
  breakfast: MealSchema,
  lunch: MealSchema,
  dinner: MealSchema,
  snacks: z.array(z.object({
    name: z.string(),
    calories: z.number(),
    description: z.string(),
  })),
  dailySummary: z.object({
    totalCalories: z.number(),
    protein: z.number(),
    carbs: z.number(),
    fat: z.number(),
    fiber: z.number(),
  }),
  recommendations: z.array(z.string()),
  avoidFoods: z.array(z.string()),
})

export async function POST(req: Request) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch user's medical profile and health survey
    const [medicalRes, surveyRes] = await Promise.all([
      supabase
        .from("medical_profiles")
        .select("extracted_values")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("health_surveys")
        .select("*")
        .eq("user_id", userId)
        .single(),
    ])

    const medicalProfile = medicalRes.data
    const healthSurvey = surveyRes.data

    // Build prompt with user data
    const healthData = medicalProfile?.extracted_values || {}
    const surveyData = healthSurvey || {}

    const prompt = `You are NutriGuard AI, an expert nutritionist specializing in Indian cuisine and personalized diet planning.

Based on the following health data and preferences, create a detailed, personalized daily diet plan:

HEALTH MARKERS:
${Object.entries(healthData).map(([key, val]: [string, unknown]) => {
  const value = val as { value: number; unit: string; status: string }
  return `- ${key}: ${value.value} ${value.unit} (${value.status})`
}).join('\n') || 'No medical data provided'}

LIFESTYLE & PREFERENCES:
- Activity Level: ${surveyData.activity_level || 'Not specified'}
- Diet Preference: ${surveyData.diet_preference || 'Not specified'}
- Meal Frequency: ${surveyData.meal_frequency || 'Not specified'}
- Health Goal: ${surveyData.health_goal || 'Not specified'}
- Allergies: ${surveyData.allergies?.length ? surveyData.allergies.join(', ') : 'None'}
- Medications: ${surveyData.medications || 'None'}
- Daily Water Goal: ${surveyData.water_goal || 2.5} liters

Create a complete Indian diet plan with:
1. Breakfast, Lunch, and Dinner with specific Indian dishes
2. 2-3 healthy snack options
3. Caloric and macro breakdown for each meal
4. Specific recommendations based on health markers
5. Foods to avoid based on their conditions

Consider:
- If blood sugar is high, focus on low glycemic foods
- If cholesterol is high, reduce saturated fats
- If the goal is weight loss, create a caloric deficit
- Honor all dietary restrictions and allergies
- Use commonly available Indian ingredients

Provide realistic portion sizes and accurate nutritional estimates.`

    const { output: dietPlan } = await generateText({
      model: "openai/gpt-5-mini",
      output: Output.object({ schema: DietPlanSchema }),
      prompt,
    })

    if (!dietPlan) {
      throw new Error("Failed to generate diet plan")
    }

    // Calculate caloric target based on goals
    let caloricTarget = dietPlan.dailySummary.totalCalories
    if (surveyData.health_goal === 'WEIGHT_LOSS') {
      caloricTarget = Math.round(caloricTarget * 0.85) // 15% deficit
    } else if (surveyData.health_goal === 'MUSCLE_GAIN') {
      caloricTarget = Math.round(caloricTarget * 1.1) // 10% surplus
    }

    // Save diet plan to database
    const { error: insertError } = await supabase.from("diet_plans").upsert({
      user_id: userId,
      plan_json: dietPlan,
      caloric_target: caloricTarget,
      macro_targets: {
        protein: dietPlan.dailySummary.protein,
        carbs: dietPlan.dailySummary.carbs,
        fat: dietPlan.dailySummary.fat,
        fiber: dietPlan.dailySummary.fiber,
      },
      is_active: true,
      generated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error("Error saving diet plan:", insertError)
    }

    return Response.json({ 
      success: true, 
      dietPlan,
      caloricTarget 
    })
  } catch (error) {
    console.error("Error generating diet plan:", error)
    return Response.json(
      { error: "Failed to generate diet plan" },
      { status: 500 }
    )
  }
}
