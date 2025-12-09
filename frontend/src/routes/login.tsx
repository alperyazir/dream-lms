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
  email: string
  password: string
  must_change_password: boolean
}

interface QuickLoginUsers {
  admin: QuickLoginUser[]
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
    staleTime: Infinity, // Cache forever (session-scoped)
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

  // Test login helper - now accepts username
  const testLogin = async (username: string, password: string) => {
    setLoginError(null)
    try {
      await loginMutation.mutateAsync({ username, password })
    } catch (err: unknown) {
      const error = err as { body?: { detail?: string } }
      setLoginError(error.body?.detail || "Invalid credentials")
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
        <p className="text-sm text-destructive -mt-2">{errors.password.message}</p>
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
      <Button variant="default" type="submit" disabled={isSubmitting || loginMutation.isPending}>
        {loginMutation.isPending ? "Logging in..." : "Log In"}
      </Button>

      {/* Test Login Buttons - Only in Development */}
      {import.meta.env.DEV && (
        <div className="mt-6 pt-6 border-t border-gray-300 dark:border-gray-700">
          <p className="text-xs text-center text-muted-foreground mb-1 font-semibold">
            🧪 Quick Test Login
          </p>
          <p className="text-[10px] text-center text-muted-foreground mb-3">
            <span className="text-orange-500">🔑</span> = requires password change after login
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
                          onClick={() =>
                            testLogin(user.username, user.password)
                          }
                          disabled={isSubmitting}
                          className={`text-xs h-7 ${user.must_change_password ? "border-orange-400 dark:border-orange-600" : ""}`}
                          title={`${user.email}${user.must_change_password ? " (requires password change)" : ""}`}
                        >
                          {user.username}
                          {user.must_change_password && (
                            <span className="ml-1 text-orange-500">🔑</span>
                          )}
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
