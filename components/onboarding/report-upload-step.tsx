"use client"

import { useState, useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  FileText, 
  Upload, 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  X,
  FileImage
} from "lucide-react"

interface ReportUploadStepProps {
  userId: string
  onComplete: () => void
}

interface ExtractedValues {
  glucose?: { value: number; unit: string; status: string }
  hemoglobin?: { value: number; unit: string; status: string }
  cholesterol?: { value: number; unit: string; status: string }
  ldl?: { value: number; unit: string; status: string }
  hdl?: { value: number; unit: string; status: string }
  triglycerides?: { value: number; unit: string; status: string }
  hba1c?: { value: number; unit: string; status: string }
  creatinine?: { value: number; unit: string; status: string }
  uricAcid?: { value: number; unit: string; status: string }
  [key: string]: { value: number; unit: string; status: string } | undefined
}

export function ReportUploadStep({ userId, onComplete }: ReportUploadStepProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [extractedValues, setExtractedValues] = useState<ExtractedValues | null>(null)
  const supabase = createClient()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0]
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB")
        return
      }
      setFile(selectedFile)
      setError(null)
      setExtractedValues(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg"],
      "application/pdf": [".pdf"],
    },
    maxFiles: 1,
  })

  const handleUploadAndAnalyze = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      // Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop()
      const fileName = `${userId}/${Date.now()}.${fileExt}`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("medical-reports")
        .upload(fileName, file)

      clearInterval(progressInterval)

      if (uploadError) {
        // If bucket doesn't exist, continue without file storage for demo
        console.log("Storage upload skipped:", uploadError.message)
      }

      setUploadProgress(100)
      setIsUploading(false)
      setIsAnalyzing(true)

      // Get public URL if upload succeeded
      let reportUrl = ""
      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from("medical-reports")
          .getPublicUrl(fileName)
        reportUrl = urlData.publicUrl
      }

      // Call AI analysis API
      const response = await fetch("/api/analyze-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId, 
          reportUrl,
          fileName: file.name 
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze report")
      }

      const { extractedValues: values } = await response.json()
      setExtractedValues(values)

      // Save to database
      await supabase.from("medical_profiles").upsert({
        user_id: userId,
        report_file_url: reportUrl,
        extracted_values: values,
        uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsUploading(false)
      setIsAnalyzing(false)
    }
  }

  const handleSkip = async () => {
    // Allow skipping but create empty medical profile
    await supabase.from("medical_profiles").upsert({
      user_id: userId,
      extracted_values: {},
      uploaded_at: new Date().toISOString(),
    })
    onComplete()
  }

  const removeFile = () => {
    setFile(null)
    setExtractedValues(null)
    setError(null)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "normal":
        return "text-green-600 bg-green-50"
      case "high":
      case "low":
        return "text-amber-600 bg-amber-50"
      case "critical":
        return "text-red-600 bg-red-50"
      default:
        return "text-muted-foreground bg-muted"
    }
  }

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          <FileText className="h-5 w-5 text-primary" />
          Upload Medical Report
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Upload your recent blood test report. Our AI will extract key health markers to create 
          a personalized diet plan. Supported formats: PDF, PNG, JPG (max 10MB)
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <Upload className="h-7 w-7 text-primary" />
              </div>
              {isDragActive ? (
                <p className="text-primary font-medium">Drop your file here...</p>
              ) : (
                <>
                  <p className="text-foreground font-medium">Drag and drop your report here</p>
                  <p className="text-sm text-muted-foreground">or click to browse files</p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* File preview */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileImage className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              {!extractedValues && !isUploading && !isAnalyzing && (
                <Button variant="ghost" size="icon" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Upload/Analysis progress */}
            {(isUploading || isAnalyzing) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {isUploading ? "Uploading..." : "Analyzing report with AI..."}
                  </span>
                  {isUploading && <span className="text-muted-foreground">{uploadProgress}%</span>}
                </div>
                {isUploading && <Progress value={uploadProgress} className="h-2" />}
                {isAnalyzing && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
              </div>
            )}

            {/* Extracted values display */}
            {extractedValues && Object.keys(extractedValues).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Analysis Complete
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(extractedValues).map(([key, data]) => (
                    data && (
                      <div key={key} className="p-3 rounded-lg bg-muted/50 border">
                        <p className="text-xs text-muted-foreground capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </p>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span className="text-lg font-semibold text-foreground">{data.value}</span>
                          <span className="text-xs text-muted-foreground">{data.unit}</span>
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(data.status)}`}>
                          {data.status}
                        </span>
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Upload button */}
            {!extractedValues && !isUploading && !isAnalyzing && (
              <Button onClick={handleUploadAndAnalyze} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Upload & Analyze
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <Button variant="ghost" onClick={handleSkip} disabled={isUploading || isAnalyzing}>
          Skip for now
        </Button>
        <Button 
          onClick={onComplete} 
          disabled={!extractedValues || isUploading || isAnalyzing}
        >
          Continue
        </Button>
      </CardFooter>
    </Card>
  )
}
