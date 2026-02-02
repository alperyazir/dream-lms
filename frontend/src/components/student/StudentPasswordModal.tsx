/**
 * StudentPasswordModal - Story 28.1
 * Modal component for viewing and setting student passwords.
 * Used by admin/supervisor/teacher to manage student credentials.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, Save } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import useCustomToast from "@/hooks/useCustomToast"
import {
  getStudentPassword,
  type StudentPasswordResponse,
  setStudentPassword,
} from "@/services/studentsApi"

interface StudentPasswordModalProps {
  studentId: string
  studentName: string
  isOpen: boolean
  onClose: () => void
}

export function StudentPasswordModal({
  studentId,
  studentName,
  isOpen,
  onClose,
}: StudentPasswordModalProps) {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const [showPassword, setShowPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const [usernameCopied, setUsernameCopied] = useState(false)
  const [passwordCopied, setPasswordCopied] = useState(false)

  // Fetch current password
  const {
    data: passwordData,
    isLoading,
    error,
    refetch,
  } = useQuery<StudentPasswordResponse>({
    queryKey: ["studentPassword", studentId],
    queryFn: () => getStudentPassword(studentId),
    enabled: isOpen && !!studentId,
    retry: false,
  })

  // Set password mutation
  const setPasswordMutation = useMutation({
    mutationFn: (password: string) => setStudentPassword(studentId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["studentPassword", studentId],
      })
      setNewPassword("")
      showSuccessToast("Password updated successfully!")
      refetch()
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to update password. Please try again.",
      )
    },
  })

  const handleCopyUsername = async () => {
    if (passwordData?.username) {
      await navigator.clipboard.writeText(passwordData.username)
      setUsernameCopied(true)
      showSuccessToast("Username copied to clipboard")
      setTimeout(() => setUsernameCopied(false), 2000)
    }
  }

  const handleCopyPassword = async () => {
    if (passwordData?.password) {
      await navigator.clipboard.writeText(passwordData.password)
      setPasswordCopied(true)
      showSuccessToast("Password copied to clipboard")
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  const handleSetPassword = () => {
    if (!newPassword) {
      showErrorToast("Please enter a new password")
      return
    }
    if (newPassword.length > 50) {
      showErrorToast("Password must be 50 characters or less")
      return
    }
    setPasswordMutation.mutate(newPassword)
  }

  const handleClose = () => {
    setNewPassword("")
    setShowPassword(false)
    setShowNewPassword(false)
    setUsernameCopied(false)
    setPasswordCopied(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-500" />
            Student Credentials
          </DialogTitle>
          <DialogDescription>
            View and manage login credentials for {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Credentials Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Current Credentials
            </h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">
                Failed to load credentials. Please try again.
              </div>
            ) : (
              <>
                {/* Username */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Username
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/50 rounded-md px-3 py-2 font-mono text-sm">
                      {passwordData?.username || "—"}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyUsername}
                      disabled={!passwordData?.username}
                      className="shrink-0"
                    >
                      {usernameCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Password
                  </Label>
                  {passwordData?.password ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted/50 rounded-md px-3 py-2 font-mono text-sm">
                        {showPassword ? passwordData.password : "••••••••"}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="shrink-0"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPassword}
                        className="shrink-0"
                      >
                        {passwordCopied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                      {passwordData?.message ||
                        "Password not available. Set a new password below."}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Set New Password Section */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Set New Password
            </h4>

            <div className="space-y-2">
              <Label
                htmlFor="new-password"
                className="text-xs text-muted-foreground"
              >
                New Password
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSetPassword}
                  disabled={!newPassword || setPasswordMutation.isPending}
                  className="shrink-0 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
                >
                  {setPasswordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                The student will use this password to log in.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
