import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { useMemo } from "react"
import { useForm } from "react-hook-form"
import { LuCheck, LuShieldCheck, LuX } from "react-icons/lu"
import { z } from "zod"

import { type UserPublic, UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { PasswordInput } from "@/components/ui/password-input"
import { Progress } from "@/components/ui/progress"
import { getMustChangePassword, getUserRole, isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"

// Password strength calculation
interface PasswordStrength {
  score: number // 0-4
  label: string
  color: string
  checks: {
    minLength: boolean
    hasUppercase: boolean
    hasLowercase: boolean
    hasNumber: boolean
    hasSpecial: boolean
  }
}

function calculatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  }

  const passedChecks = Object.values(checks).filter(Boolean).length

  let score = 0
  let label = "Very Weak"
  let color = "bg-destructive"

  if (passedChecks >= 5) {
    score = 4
    label = "Very Strong"
    color = "bg-green-500"
  } else if (passedChecks >= 4) {
    score = 3
    label = "Strong"
    color = "bg-green-400"
  } else if (passedChecks >= 3) {
    score = 2
    label = "Fair"
    color = "bg-yellow-500"
  } else if (passedChecks >= 2) {
    score = 1
    label = "Weak"
    color = "bg-orange-500"
  }

  return { score, label, color, checks }
}

// Validation schema
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(40, "Password must be less than 40 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[a-z]/, "Password must contain at least one lowercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

type ChangePasswordForm = z.infer<typeof changePasswordSchema>

export const Route = createFileRoute("/change-password")({
  beforeLoad: () => {
    // Redirect if not authenticated
    if (!isLoggedIn()) {
      throw redirect({ to: "/login" })
    }
    // Story 28.1: Students cannot change their own passwords - teachers manage them
    const role = getUserRole()
    if (role === "student") {
      throw redirect({ to: "/student/dashboard" })
    }
    // Redirect if doesn't need password change
    if (!getMustChangePassword()) {
      throw redirect({ to: "/" })
    }
  },
  component: ChangePasswordPage,
})

function ChangePasswordPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
  } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  })

  const newPassword = watch("newPassword")
  const passwordStrength = useMemo(
    () => calculatePasswordStrength(newPassword || ""),
    [newPassword],
  )

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      UsersService.changeInitialPassword({
        requestBody: {
          current_password: data.currentPassword,
          new_password: data.newPassword,
        },
      }),
    onSuccess: async () => {
      showSuccessToast("Password changed successfully!")
      // Clear the must_change_password flag
      sessionStorage.removeItem("must_change_password")
      // Refetch user to get updated must_change_password status
      await queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      // Navigate to role-appropriate dashboard
      navigateToRoleDashboard()
    },
    onError: (error: unknown) => {
      const err = error as { body?: { detail?: string } }
      if (err.body?.detail === "Current password is incorrect") {
        setError("currentPassword", {
          message: "Current password is incorrect",
        })
      } else {
        showErrorToast(err.body?.detail || "Failed to change password")
      }
    },
  })

  const navigateToRoleDashboard = () => {
    const user = queryClient.getQueryData<UserPublic>(["currentUser"])
    const role = user?.role
    switch (role) {
      case "admin":
        navigate({ to: "/admin/dashboard" })
        break
      case "publisher":
        navigate({ to: "/publisher/dashboard" })
        break
      case "teacher":
        navigate({ to: "/teacher/dashboard" })
        break
      case "student":
        navigate({ to: "/student/dashboard" })
        break
      default:
        navigate({ to: "/" })
    }
  }

  const onSubmit = (data: ChangePasswordForm) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <LuShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Change Your Password</CardTitle>
          <CardDescription>
            For security, you must change your temporary password before
            continuing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <PasswordInput
                id="currentPassword"
                placeholder="Enter your temporary password"
                {...register("currentPassword")}
              />
              {errors.currentPassword && (
                <p className="text-sm text-destructive">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <PasswordInput
                id="newPassword"
                placeholder="Enter your new password"
                {...register("newPassword")}
              />
              {errors.newPassword && (
                <p className="text-sm text-destructive">
                  {errors.newPassword.message}
                </p>
              )}

              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Password strength:
                    </span>
                    <span
                      className={`font-medium ${
                        passwordStrength.score >= 3
                          ? "text-green-600"
                          : passwordStrength.score >= 2
                            ? "text-yellow-600"
                            : "text-destructive"
                      }`}
                    >
                      {passwordStrength.label}
                    </span>
                  </div>
                  <Progress
                    value={(passwordStrength.score / 4) * 100}
                    className="h-1.5"
                  />
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <div className="flex items-center gap-1">
                      {passwordStrength.checks.minLength ? (
                        <LuCheck className="h-3 w-3 text-green-600" />
                      ) : (
                        <LuX className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span
                        className={
                          passwordStrength.checks.minLength
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        8+ characters
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {passwordStrength.checks.hasUppercase ? (
                        <LuCheck className="h-3 w-3 text-green-600" />
                      ) : (
                        <LuX className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span
                        className={
                          passwordStrength.checks.hasUppercase
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        Uppercase
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {passwordStrength.checks.hasLowercase ? (
                        <LuCheck className="h-3 w-3 text-green-600" />
                      ) : (
                        <LuX className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span
                        className={
                          passwordStrength.checks.hasLowercase
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        Lowercase
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {passwordStrength.checks.hasNumber ? (
                        <LuCheck className="h-3 w-3 text-green-600" />
                      ) : (
                        <LuX className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span
                        className={
                          passwordStrength.checks.hasNumber
                            ? "text-green-600"
                            : "text-muted-foreground"
                        }
                      >
                        Number
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <PasswordInput
                id="confirmPassword"
                placeholder="Confirm your new password"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={changePasswordMutation.isPending}
            >
              {changePasswordMutation.isPending
                ? "Changing Password..."
                : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
