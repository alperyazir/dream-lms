import { useMutation } from "@tanstack/react-query"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import { FiLock } from "react-icons/fi"

import { type ApiError, LoginService, type NewPassword } from "@/client"
import { Button } from "@/components/ui/button"
import { PasswordInput } from "@/components/ui/password-input"
import { isLoggedIn } from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { confirmPasswordRules, handleError, passwordRules } from "@/utils"

interface NewPasswordForm extends NewPassword {
  confirm_password: string
}

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

function ResetPassword() {
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm<NewPasswordForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      new_password: "",
    },
  })
  const { showSuccessToast } = useCustomToast()
  const navigate = useNavigate()

  const resetPassword = async (data: NewPassword) => {
    const token = new URLSearchParams(window.location.search).get("token")
    if (!token) return
    await LoginService.resetPassword({
      requestBody: { new_password: data.new_password, token: token },
    })
  }

  const mutation = useMutation({
    mutationFn: resetPassword,
    onSuccess: () => {
      showSuccessToast("Password updated successfully.")
      reset()
      navigate({ to: "/login" })
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const onSubmit: SubmitHandler<NewPasswordForm> = async (data) => {
    mutation.mutate(data)
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="h-screen max-w-sm flex flex-col items-stretch justify-center gap-4 mx-auto px-4"
    >
      <h1 className="text-3xl text-center mb-2">
        Reset Password
      </h1>
      <p className="text-center">
        Please enter your new password and confirm it to reset your password.
      </p>
      <PasswordInput
        startElement={<FiLock />}
        type="new_password"
        errors={errors}
        {...register("new_password", passwordRules())}
        placeholder="New Password"
      />
      <PasswordInput
        startElement={<FiLock />}
        type="confirm_password"
        errors={errors}
        {...register("confirm_password", confirmPasswordRules(getValues))}
        placeholder="Confirm Password"
      />
      <Button variant="default" type="submit">
        Reset Password
      </Button>
    </form>
  )
}
