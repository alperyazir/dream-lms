/**
 * Import Students Dialog - Bulk student import via Excel (Story 9.9)
 */
import { useMutation, useQuery } from "@tanstack/react-query"
import axios from "axios"
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Upload,
  X,
} from "lucide-react"
import { useCallback, useRef, useState } from "react"
import {
  AdminService,
  StudentsService,
  type ImportCredential,
  type ImportRowResult,
  type ImportValidationResponse,
  type SchoolPublic,
  type TeacherPublic,
} from "@/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"

type ImportStep = "upload" | "validate" | "preview" | "importing" | "complete"

interface ImportStudentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete?: () => void
  isAdmin: boolean
}

export function ImportStudentsDialog({
  open,
  onOpenChange,
  onImportComplete,
  isAdmin,
}: ImportStudentsDialogProps) {
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // State
  const [step, setStep] = useState<ImportStep>("upload")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>("")
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>("")
  const [validationResult, setValidationResult] =
    useState<ImportValidationResponse | null>(null)
  const [importedCredentials, setImportedCredentials] = useState<
    ImportCredential[]
  >([])
  const [importErrors, setImportErrors] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)

  // Fetch schools for admin
  const { data: schools = [] } = useQuery({
    queryKey: ["schools"],
    queryFn: () => AdminService.listSchools({}),
    enabled: isAdmin && open,
  })

  // Fetch teachers for the selected school (admin only)
  const { data: teachers = [] } = useQuery({
    queryKey: ["teachers", selectedSchoolId],
    queryFn: () => AdminService.listTeachers({ schoolId: selectedSchoolId }),
    enabled: isAdmin && open && !!selectedSchoolId,
  })

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = { file }
      return StudentsService.validateImportFile({ formData })
    },
    onSuccess: (data) => {
      setValidationResult(data)
      setStep("preview")
    },
    onError: (error: any) => {
      showErrorToast(error.body?.detail || "Failed to validate file")
      setStep("upload")
    },
  })

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = { file }
      return StudentsService.executeImport({
        formData,
        schoolId: isAdmin ? selectedSchoolId : undefined,
        teacherId: isAdmin && selectedTeacherId ? selectedTeacherId : undefined,
      })
    },
    onSuccess: (data) => {
      setImportedCredentials(data.credentials)
      setImportErrors(data.errors || [])
      setStep("complete")
      if (data.created_count > 0) {
        showSuccessToast(`Successfully imported ${data.created_count} students`)
        onImportComplete?.()
      }
    },
    onError: (error: any) => {
      showErrorToast(error.body?.detail || "Failed to import students")
      setStep("preview")
    },
  })

  // Reset state when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStep("upload")
      setSelectedFile(null)
      setSelectedSchoolId("")
      setSelectedTeacherId("")
      setValidationResult(null)
      setImportedCredentials([])
      setImportErrors([])
    }
    onOpenChange(open)
  }

  // Reset teacher when school changes
  const handleSchoolChange = (schoolId: string) => {
    setSelectedSchoolId(schoolId)
    setSelectedTeacherId("") // Reset teacher when school changes
  }

  // File handling
  const handleFileSelect = (file: File) => {
    const validTypes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ]
    if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx")) {
      showErrorToast("Please select an Excel file (.xlsx)")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      showErrorToast("File size must be less than 5MB")
      return
    }
    setSelectedFile(file)
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }, [])

  const handleValidate = () => {
    if (!selectedFile) return
    if (isAdmin && !selectedSchoolId) {
      showErrorToast("Please select a school")
      return
    }
    if (isAdmin && !selectedTeacherId) {
      showErrorToast("Please select a teacher")
      return
    }
    setStep("validate")
    validateMutation.mutate(selectedFile)
  }

  const handleImport = () => {
    if (!selectedFile) return
    setStep("importing")
    importMutation.mutate(selectedFile)
  }

  const handleDownloadTemplate = async () => {
    try {
      const token = localStorage.getItem("access_token")
      const baseUrl = import.meta.env.VITE_API_URL || ""
      const response = await axios.get(
        `${baseUrl}/api/v1/students/import-template`,
        {
          responseType: "arraybuffer",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      // Check if response is actually an Excel file (should be > 1KB)
      if (response.data.byteLength < 1000) {
        // Might be an error response, try to decode it
        const decoder = new TextDecoder("utf-8")
        const text = decoder.decode(response.data)
        console.error("Template download failed:", text)
        showErrorToast("Failed to download template - server error")
        return
      }

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "student_import_template.xlsx"
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error: any) {
      console.error("Template download error:", error)
      showErrorToast("Failed to download template")
    }
  }

  const handleDownloadCredentials = async () => {
    if (importedCredentials.length === 0) return
    try {
      const token = localStorage.getItem("access_token")
      const baseUrl = import.meta.env.VITE_API_URL || ""
      const response = await axios.post(
        `${baseUrl}/api/v1/students/import/credentials`,
        { credentials: importedCredentials },
        {
          responseType: "arraybuffer",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      )

      const blob = new Blob([response.data], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `student_credentials_${new Date().toISOString().split("T")[0]}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      showSuccessToast("Credentials downloaded successfully")
    } catch {
      showErrorToast("Failed to download credentials")
    }
  }

  const getStatusBadge = (status: ImportRowResult["status"]) => {
    switch (status) {
      case "valid":
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Valid
          </Badge>
        )
      case "warning":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Warning
          </Badge>
        )
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <AlertCircle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )
    }
  }

  // Rows with warnings can still be imported (warnings are auto-fixed, like username conflicts)
  const importableCount = validationResult
    ? validationResult.valid_count + validationResult.warning_count
    : 0
  const canProceedToImport =
    validationResult &&
    importableCount > 0 &&
    validationResult.error_count === 0

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-teal-500" />
            Import Students from Excel
          </DialogTitle>
          <DialogDescription>
            Upload an Excel file to bulk import students into the system.
          </DialogDescription>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-6 py-4">
            {/* Template download */}
            <Alert>
              <FileSpreadsheet className="w-4 h-4" />
              <AlertTitle>Need a template?</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>
                  Download our Excel template with the required columns.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadTemplate}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Template
                </Button>
              </AlertDescription>
            </Alert>

            {/* School and Teacher selectors for admin */}
            {isAdmin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school-select">School *</Label>
                  <Select
                    value={selectedSchoolId}
                    onValueChange={handleSchoolChange}
                  >
                    <SelectTrigger id="school-select">
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map((school: SchoolPublic) => (
                        <SelectItem key={school.id} value={school.id}>
                          {school.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select the school for students.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="teacher-select">Teacher *</Label>
                  <Select
                    value={selectedTeacherId}
                    onValueChange={setSelectedTeacherId}
                    disabled={!selectedSchoolId}
                  >
                    <SelectTrigger id="teacher-select">
                      <SelectValue placeholder={selectedSchoolId ? "Select a teacher" : "Select school first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {teachers.map((teacher: TeacherPublic) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.user_full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Teacher for classroom assignment.
                  </p>
                </div>
              </div>
            )}

            {/* File drop zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-300 hover:border-teal-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0])
                  }
                }}
              />
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-green-500" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFile(null)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground">
                    Drag and drop your Excel file here, or
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Browse Files
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Maximum file size: 5MB. Maximum 500 students per import.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: Validating */}
        {step === "validate" && (
          <div className="py-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto" />
            <p className="text-muted-foreground">Validating your file...</p>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && validationResult && (
          <div className="space-y-4 py-4">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {validationResult.total_count}
                </div>
                <div className="text-sm text-muted-foreground">Total Rows</div>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {validationResult.valid_count + validationResult.warning_count}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Importable</div>
              </div>
              <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {validationResult.warning_count}
                </div>
                <div className="text-sm text-yellow-600 dark:text-yellow-400">Auto-fixed</div>
              </div>
              <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {validationResult.error_count}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">Errors</div>
              </div>
            </div>

            {/* Error alert */}
            {validationResult.error_count > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errors Found</AlertTitle>
                <AlertDescription>
                  Please fix the errors in your Excel file and try again. Rows
                  with errors will not be imported.
                </AlertDescription>
              </Alert>
            )}

            {/* Auto-fixed info alert */}
            {validationResult.warning_count > 0 && validationResult.error_count === 0 && (
              <Alert className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                  Auto-fixed Issues
                </AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                  {validationResult.warning_count} row(s) had username conflicts that were
                  automatically resolved. The new usernames are shown in the preview below.
                </AlertDescription>
              </Alert>
            )}

            {/* Preview table */}
            <div className="border rounded-lg max-h-[300px] overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-gray-900">
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResult.rows.map((row) => (
                    <TableRow
                      key={row.row_number}
                      className={
                        row.status === "error"
                          ? "bg-red-50 dark:bg-red-900/20"
                          : row.status === "warning"
                            ? "bg-yellow-50 dark:bg-yellow-900/20"
                            : ""
                      }
                    >
                      <TableCell>{row.row_number}</TableCell>
                      <TableCell className="font-medium">
                        {row.full_name}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {row.username}
                      </TableCell>
                      <TableCell>{row.email || "-"}</TableCell>
                      <TableCell>{row.grade || "-"}</TableCell>
                      <TableCell>{row.class_name || "-"}</TableCell>
                      <TableCell>{getStatusBadge(row.status)}</TableCell>
                      <TableCell>
                        {row.errors && row.errors.length > 0 && (
                          <ul className="text-sm text-red-600 list-disc list-inside">
                            {row.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        )}
                        {row.warnings && row.warnings.length > 0 && (
                          <ul className="text-sm text-yellow-600 list-disc list-inside">
                            {row.warnings.map((warning, i) => (
                              <li key={i}>{warning}</li>
                            ))}
                          </ul>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="py-12 space-y-6">
            <div className="flex flex-col items-center gap-4">
              {/* Animated dots */}
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Importing students</span>
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                This may take a moment for large imports.
              </p>
            </div>
          </div>
        )}

        {/* Step: Complete */}
        {step === "complete" && (
          <div className="space-y-6 py-4">
            {/* Success message */}
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold">Import Complete!</h3>
              <p className="text-muted-foreground">
                Successfully created {importedCredentials.length} student
                accounts.
              </p>
            </div>

            {/* Info messages (like auto-created classrooms) */}
            {importErrors.filter(e => e.startsWith("Info:")).length > 0 && (
              <Alert className="border-teal-200 bg-teal-50 dark:bg-teal-950/30 dark:border-teal-800">
                <CheckCircle2 className="h-4 w-4 text-teal-600" />
                <AlertTitle className="text-teal-800 dark:text-teal-300">Additional Actions</AlertTitle>
                <AlertDescription className="text-teal-700 dark:text-teal-400">
                  <ul className="list-disc list-inside mt-2">
                    {importErrors.filter(e => e.startsWith("Info:")).map((info, i) => (
                      <li key={i}>{info.replace("Info: ", "")}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Actual errors if any */}
            {importErrors.filter(e => !e.startsWith("Info:")).length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Some imports failed</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2">
                    {importErrors.filter(e => !e.startsWith("Info:")).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Credentials table */}
            {importedCredentials.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Student Credentials</h4>
                  <Button
                    variant="outline"
                    onClick={handleDownloadCredentials}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Credentials
                  </Button>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    Download and save the credentials file securely. Passwords
                    are shown only once and cannot be retrieved later.
                  </AlertDescription>
                </Alert>

                <div className="border rounded-lg max-h-[200px] overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0 bg-white">
                      <TableRow>
                        <TableHead>Full Name</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Password</TableHead>
                        <TableHead>Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importedCredentials.map((cred, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">
                            {cred.full_name}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {cred.username}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {cred.password}
                          </TableCell>
                          <TableCell>{cred.email || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === "upload" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleValidate}
                disabled={
                  !selectedFile || (isAdmin && (!selectedSchoolId || !selectedTeacherId))
                }
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
              >
                Validate File
              </Button>
            </>
          )}

          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("upload")
                  setValidationResult(null)
                }}
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={!canProceedToImport}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
              >
                Import {importableCount} Students
              </Button>
            </>
          )}

          {step === "complete" && (
            <Button onClick={() => handleOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
