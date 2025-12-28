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

const setMustChangePasswordStorage = (value: boolean) => {
  if (value) {
    sessionStorage.setItem("must_change_password", "true")
  } else {
    sessionStorage.removeItem("must_change_password")
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
    onSuccess: (response) => {
      // Invalidate currentUser to fetch fresh data for the new user
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
      // Redirect based on must_change_password flag
      if (response.must_change_password) {
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

export { isLoggedIn, getMustChangePassword }
export default useAuth
