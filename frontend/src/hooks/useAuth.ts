import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { useCallback, useState } from "react"

import {
  type Body_login_login_access_token as AccessToken,
  LoginService,
  type UserPublic,
  UsersService,
} from "@/client"

const isLoggedIn = () => {
  return localStorage.getItem("access_token") !== null
}

const getMustChangePassword = () => {
  return sessionStorage.getItem("must_change_password") === "true"
}

// Story 28.1: Get user role from session storage for route guards
const getUserRole = () => {
  return sessionStorage.getItem("user_role")
}

const setMustChangePasswordStorage = (value: boolean) => {
  if (value) {
    sessionStorage.setItem("must_change_password", "true")
  } else {
    sessionStorage.removeItem("must_change_password")
  }
}

// Story 28.1: Store user role in session storage
const setUserRoleStorage = (role: string | null | undefined) => {
  if (role) {
    sessionStorage.setItem("user_role", role)
  } else {
    sessionStorage.removeItem("user_role")
  }
}

const useAuth = () => {
  const [mustChangePassword, setMustChangePasswordState] = useState(
    getMustChangePassword,
  )
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useQuery<UserPublic | null, Error>({
    queryKey: ["currentUser"],
    queryFn: UsersService.readUserMe,
    enabled: isLoggedIn(),
  })

  const setMustChangePassword = useCallback((value: boolean) => {
    setMustChangePasswordStorage(value)
    setMustChangePasswordState(value)
  }, [])

  // Signup feature removed in Epic 7 - users are created by admins only
  // const signUpMutation = useMutation({
  //   mutationFn: (data: UserRegister) =>
  //     UsersService.registerUser({ requestBody: data }),
  //
  //   onSuccess: () => {
  //     navigate({ to: "/login" })
  //   },
  //   onError: (err: ApiError) => {
  //     handleError(err)
  //   },
  //   onSettled: () => {
  //     queryClient.invalidateQueries({ queryKey: ["users"] })
  //   },
  // })

  const login = async (data: AccessToken) => {
    const response = await LoginService.loginAccessToken({
      formData: data,
    })
    localStorage.setItem("access_token", response.access_token)
    // Store must_change_password flag in session storage
    setMustChangePasswordStorage(response.must_change_password ?? false)
    setMustChangePasswordState(response.must_change_password ?? false)
    return response
  }

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: async (response) => {
      // Invalidate currentUser to fetch fresh data for the new user
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      // Story 28.1: Fetch user data and store role for route guards
      try {
        const userData = await UsersService.readUserMe()
        setUserRoleStorage(userData.role)
      } catch {
        // Continue even if user fetch fails - role check will be handled in components
      }
      // Redirect based on must_change_password flag
      // Story 28.1: Students cannot change passwords, so skip change-password redirect
      const storedRole = getUserRole()
      if (response.must_change_password && storedRole !== "student") {
        navigate({ to: "/change-password" })
      } else {
        navigate({ to: "/" })
      }
    },
    // Don't show toast - let the calling component handle errors inline
  })

  const logout = () => {
    // Remove token
    localStorage.removeItem("access_token")
    // Clear must_change_password flag
    sessionStorage.removeItem("must_change_password")
    // Story 28.1: Clear user role
    sessionStorage.removeItem("user_role")
    setMustChangePasswordState(false)

    // Clear all query cache to remove old user data
    queryClient.clear()

    // Navigate to login
    navigate({ to: "/login" })
  }

  return {
    // signUpMutation removed - signup feature disabled in Epic 7
    loginMutation,
    logout,
    user,
    mustChangePassword,
    setMustChangePassword,
  }
}

export { isLoggedIn, getMustChangePassword, getUserRole }
export default useAuth
