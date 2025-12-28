import { useQuery } from "@tanstack/react-query"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import type { Body_login_login_access_token as AccessToken } from "@/client"
import { OpenAPI } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import Logo from "/assets/images/dreamedtech_with_name.svg"
import { passwordRules } from "../utils"

// Type for quick login users response
interface QuickLoginUser {
  username: string
  email: string | null
}

interface QuickLoginUsers {
  admin: QuickLoginUser[]
  supervisor: QuickLoginUser[]
  publisher: QuickLoginUser[]
  teacher: QuickLoginUser[]
  student: QuickLoginUser[]
}

export const Route = createFileRoute("/login")({
  component: Login,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

function Login() {
  const { loginMutation } = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  // Fetch quick login users (development only)
  const { data: quickLoginUsers, isError } = useQuery<QuickLoginUsers>({
    queryKey: ["quick-login-users"],
    queryFn: async () => {
      const response = await fetch(
        `${OpenAPI.BASE}/api/v1/dev/quick-login-users`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      if (!response.ok) {
        throw new Error("Failed to fetch quick login users")
      }
      return response.json()
    },
    enabled: import.meta.env.DEV, // Only in development
    retry: false, // Don't retry on failure
    staleTime: 0, // Always refetch on mount to get latest data
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    setLoginError(null)

    try {
      await loginMutation.mutateAsync(data)
    } catch (err: unknown) {
      const error = err as { body?: { detail?: string } }
      setLoginError(error.body?.detail || "Invalid credentials")
    }
  }

  // Instant login helper - uses dev endpoint that bypasses password
  const instantLogin = async (username: string) => {
    setLoginError(null)
    try {
      const response = await fetch(
        `${OpenAPI.BASE}/api/v1/dev/instant-login/${username}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || "Login failed")
      }
      const data = await response.json()
      // Store token and redirect
      localStorage.setItem("access_token", data.access_token)
      window.location.href = "/"
    } catch (err: unknown) {
      const error = err as Error
      setLoginError(error.message || "Login failed")
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="h-screen max-w-sm flex flex-col items-stretch justify-center gap-4 mx-auto px-4"
    >
      <img
        src={Logo}
        alt="DreamEdTech logo"
        className="h-auto max-w-xs self-center mb-4"
      />
      <Field
      /* invalid prop removed */
      >
        <InputGroup className="w-full">
          <Input
            {...register("username", {
              required: "Username or email is required",
            })}
            placeholder="Enter username or email"
            type="text"
          />
        </InputGroup>
      </Field>
      <PasswordInput
        {...register("password", passwordRules())}
        placeholder="Password"
      />
      {errors.password && (
        <p className="text-sm text-destructive -mt-2">
          {errors.password.message}
        </p>
      )}

      {/* Inline error message */}
      {loginError && (
        <p className="text-sm text-destructive text-center py-2 px-3 bg-destructive/10 rounded-md">
          {loginError}
        </p>
      )}

      <RouterLink to="/recover-password" className="main-link">
        Forgot Password?
      </RouterLink>
      <Button
        variant="default"
        type="submit"
        disabled={isSubmitting || loginMutation.isPending}
      >
        {loginMutation.isPending ? "Logging in..." : "Log In"}
      </Button>

      {/* Test Login Buttons - Only in Development */}
      {import.meta.env.DEV && (
        <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-700">
          <p className="text-xs text-center text-muted-foreground mb-3 font-semibold">
            🧪 Quick Test Login
          </p>
          {isError && (
            <p className="text-xs text-center text-red-500">
              Quick login unavailable
            </p>
          )}
          {!isError && quickLoginUsers && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {[
                {
                  key: "admin" as const,
                  emoji: "👑",
                  label: "Admin",
                  color: "text-yellow-600",
                },
                {
                  key: "supervisor" as const,
                  emoji: "🛡️",
                  label: "Supervisor",
                  color: "text-teal-600",
                },
                {
                  key: "publisher" as const,
                  emoji: "📚",
                  label: "Publisher",
                  color: "text-blue-600",
                },
                {
                  key: "teacher" as const,
                  emoji: "🍎",
                  label: "Teacher",
                  color: "text-green-600",
                },
                {
                  key: "student" as const,
                  emoji: "🎓",
                  label: "Student",
                  color: "text-purple-600",
                },
              ].map((role) => {
                const users = quickLoginUsers[role.key] || []
                if (users.length === 0) return null
                return (
                  <div key={role.key}>
                    <p className={`text-xs font-semibold mb-1 ${role.color}`}>
                      {role.emoji} {role.label}s ({users.length})
                    </p>
                    <div className="grid grid-cols-2 gap-1">
                      {users.map((user) => (
                        <Button
                          key={user.username}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => instantLogin(user.username)}
                          disabled={isSubmitting}
                          className="text-xs h-7"
                          title={user.email || user.username}
                        >
                          {user.username}
                        </Button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </form>
  )
}
