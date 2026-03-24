import { generateText, Output } from "ai"
import { z } from "zod"

const ExtractedValuesSchema = z.object({
  glucose: z.object({
    value: z.number(),
    unit: z.string(),
    status: z.string(),
  }).nullable(),
  hemoglobin: z.object({
    value: z.number(),
    unit: z.string(),
    status: z.string(),
  }).nullable(),
  cholesterol: z.object({
    value: z.number(),
    unit: z.string(),
    status: z.string(),
  }).nullable(),
  ldl: z.object({
    value: z.number(),
    unit: z.string(),
    status: z.string(),
  }).nullable(),
  hdl: z.object({
    value: z.number(),
    unit: z.string(),
    status: z.string(),
  }).nullable(),
  triglycerides: z.object({
    value: z.number(),
    unit: z.string(),
    status: z.string(),
  }).nullable(),
  hba1c: z.object({
    value: z.number(),
    unit: z.string(),
    status: z.string(),
  }).nullable(),
  creatinine: z.object({
    value: z.number(),
    unit: z.string(),
    status: z.string(),
  }).nullable(),
  uricAcid: z.object({
    value: z.number(),
    unit: z.string(),
    status: z.string(),
  }).nullable(),
})

export async function POST(req: Request) {
  try {
    const { userId, reportUrl, fileName } = await req.json()

    if (!userId) {
      return Response.json({ error: "User ID is required" }, { status: 400 })
    }

    // For demo purposes, generate simulated extracted values
    // In production, this would use vision models to analyze the actual report
    const { output } = await generateText({
      model: "openai/gpt-5-mini",
      output: Output.object({ schema: ExtractedValuesSchema }),
      prompt: `You are a medical report analyzer. Generate realistic blood test values for a person who might be seeking nutrition guidance.

The person uploaded a file named: ${fileName || "blood_report.pdf"}

Generate values that represent someone who might benefit from dietary changes. Include a mix of normal and slightly concerning values. Status should be one of: "normal", "low", "high", or "critical".

Common reference ranges:
- Glucose (fasting): 70-100 mg/dL (normal), 100-125 (high/prediabetic), >126 (critical)
- Hemoglobin: 12-17 g/dL (normal)
- Total Cholesterol: <200 mg/dL (normal), 200-239 (high), >240 (critical)
- LDL: <100 mg/dL (normal), 100-159 (high), >160 (critical)
- HDL: >40 mg/dL (normal for men), >50 mg/dL (normal for women)
- Triglycerides: <150 mg/dL (normal), 150-199 (high), >200 (critical)
- HbA1c: <5.7% (normal), 5.7-6.4% (high), >6.5% (critical)
- Creatinine: 0.7-1.3 mg/dL (normal)
- Uric Acid: 3.5-7.2 mg/dL (normal)

Generate realistic values based on a typical patient seeking nutrition advice.`,
    })

    // Filter out null values
    const extractedValues: Record<string, { value: number; unit: string; status: string }> = {}
    for (const [key, value] of Object.entries(output || {})) {
      if (value) {
        extractedValues[key] = value
      }
    }

    return Response.json({ 
      success: true, 
      extractedValues,
      reportUrl 
    })
  } catch (error) {
    console.error("Error analyzing report:", error)
    return Response.json(
      { error: "Failed to analyze report" },
      { status: 500 }
    )
  }
}
