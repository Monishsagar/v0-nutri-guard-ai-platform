-- NutriGuard AI Database Schema
-- Users/Profiles table with role distinction

-- Profiles table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT,
  role TEXT NOT NULL DEFAULT 'DIET_USER' CHECK (role IN ('DIET_USER', 'GUIDE')),
  onboarding_step INTEGER DEFAULT 0,
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guide-User Links table
CREATE TABLE IF NOT EXISTS public.guide_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  UNIQUE(guide_id, user_id)
);

-- Medical Profiles table
CREATE TABLE IF NOT EXISTS public.medical_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_file_url TEXT,
  extracted_values JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health Surveys table
CREATE TABLE IF NOT EXISTS public.health_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  allergies TEXT[] DEFAULT '{}',
  activity_level TEXT CHECK (activity_level IN ('VERY_ACTIVE', 'ACTIVE', 'LIGHTLY_ACTIVE', 'SEDENTARY')),
  diet_preference TEXT CHECK (diet_preference IN ('VEGETARIAN', 'NON_VEGETARIAN', 'EGGETARIAN', 'VEGAN')),
  meal_frequency TEXT CHECK (meal_frequency IN ('TWO_MEALS', 'THREE_MEALS', 'FOUR_FIVE_MEALS')),
  water_goal NUMERIC DEFAULT 2.0,
  medications TEXT,
  health_goal TEXT CHECK (health_goal IN ('WEIGHT_LOSS', 'MUSCLE_GAIN', 'BLOOD_SUGAR_CONTROL', 'HEART_HEALTH', 'GENERAL_WELLNESS')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diet Plans table
CREATE TABLE IF NOT EXISTS public.diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_json JSONB NOT NULL DEFAULT '{}',
  caloric_target INTEGER,
  macro_targets JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal Logs table
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  meal_slot TEXT NOT NULL CHECK (meal_slot IN ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK')),
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  photo_url TEXT,
  detected_foods JSONB DEFAULT '[]',
  total_nutrition JSONB DEFAULT '{}',
  deviation_class TEXT CHECK (deviation_class IN ('PERFECT', 'MINOR', 'MAJOR')),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guide_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  alert_type TEXT DEFAULT 'CONSECUTIVE_DEVIATION',
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  meal_log_ids UUID[] DEFAULT '{}',
  email_sent_to_user BOOLEAN DEFAULT FALSE,
  email_sent_to_guide BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_guide_user_links_guide ON public.guide_user_links(guide_id);
CREATE INDEX IF NOT EXISTS idx_guide_user_links_user ON public.guide_user_links(user_id);
CREATE INDEX IF NOT EXISTS idx_medical_profiles_user ON public.medical_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_health_surveys_user ON public.health_surveys(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_user ON public.diet_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_diet_plans_active ON public.diet_plans(is_active);
CREATE INDEX IF NOT EXISTS idx_meal_logs_user ON public.meal_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_logs_date ON public.meal_logs(logged_at);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON public.alerts(user_id);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guide_user_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diet_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "profiles_select_own" ON public.profiles 
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

-- Allow guides to view their linked users' profiles
CREATE POLICY "profiles_select_linked_users" ON public.profiles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.guide_user_links 
      WHERE guide_id = auth.uid() 
      AND user_id = profiles.id 
      AND status = 'ACCEPTED'
    )
  );

-- Guide-User Links RLS Policies
CREATE POLICY "links_select_own" ON public.guide_user_links 
  FOR SELECT USING (auth.uid() = guide_id OR auth.uid() = user_id);
CREATE POLICY "links_insert_own" ON public.guide_user_links 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "links_update_own" ON public.guide_user_links 
  FOR UPDATE USING (auth.uid() = guide_id OR auth.uid() = user_id);
CREATE POLICY "links_delete_own" ON public.guide_user_links 
  FOR DELETE USING (auth.uid() = guide_id OR auth.uid() = user_id);

-- Medical Profiles RLS Policies
CREATE POLICY "medical_select_own" ON public.medical_profiles 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "medical_insert_own" ON public.medical_profiles 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "medical_update_own" ON public.medical_profiles 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "medical_select_linked" ON public.medical_profiles 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.guide_user_links 
      WHERE guide_id = auth.uid() 
      AND user_id = medical_profiles.user_id 
      AND status = 'ACCEPTED'
    )
  );

-- Health Surveys RLS Policies
CREATE POLICY "surveys_select_own" ON public.health_surveys 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "surveys_insert_own" ON public.health_surveys 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "surveys_update_own" ON public.health_surveys 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "surveys_select_linked" ON public.health_surveys 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.guide_user_links 
      WHERE guide_id = auth.uid() 
      AND user_id = health_surveys.user_id 
      AND status = 'ACCEPTED'
    )
  );

-- Diet Plans RLS Policies
CREATE POLICY "plans_select_own" ON public.diet_plans 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "plans_insert_own" ON public.diet_plans 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "plans_update_own" ON public.diet_plans 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "plans_select_linked" ON public.diet_plans 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.guide_user_links 
      WHERE guide_id = auth.uid() 
      AND user_id = diet_plans.user_id 
      AND status = 'ACCEPTED'
    )
  );

-- Meal Logs RLS Policies
CREATE POLICY "meals_select_own" ON public.meal_logs 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "meals_insert_own" ON public.meal_logs 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "meals_update_own" ON public.meal_logs 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "meals_delete_own" ON public.meal_logs 
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "meals_select_linked" ON public.meal_logs 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.guide_user_links 
      WHERE guide_id = auth.uid() 
      AND user_id = meal_logs.user_id 
      AND status = 'ACCEPTED'
    )
  );

-- Alerts RLS Policies
CREATE POLICY "alerts_select_own" ON public.alerts 
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = guide_id);
CREATE POLICY "alerts_insert_own" ON public.alerts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alerts_update_own" ON public.alerts 
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = guide_id);
