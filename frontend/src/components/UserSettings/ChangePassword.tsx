import { useMutation } from "@tanstack/react-query"
import { type SubmitHandler, useForm } from "react-hook-form"
import { type ApiError, type UpdatePassword, UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { confirmPasswordRules, handleError, passwordRules } from "@/utils"
import { PasswordInput } from "../ui/password-input"

interface UpdatePasswordForm extends UpdatePassword {
  confirm_password: string
}

const ChangePassword = () => {
  const { showSuccessToast } = useCustomToast()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting },
  } = useForm<UpdatePasswordForm>({
    mode: "onBlur",
    criteriaMode: "all",
  })

  const mutation = useMutation({
    mutationFn: (data: UpdatePassword) =>
      UsersService.updatePasswordMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("Password updated successfully.")
      reset()
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
  })

  const onSubmit: SubmitHandler<UpdatePasswordForm> = async (data) => {
    mutation.mutate(data)
  }

  return (
    <div className="max-w-full">
      <h3 className="text-sm font-semibold py-4">Change Password</h3>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-4 w-full md:w-96">
          <PasswordInput
            type="current_password"
            {...register("current_password", passwordRules())}
            placeholder="Current Password"
          />
          <PasswordInput
            type="new_password"
            {...register("new_password", passwordRules())}
            placeholder="New Password"
          />
          <PasswordInput
            type="confirm_password"
            {...register("confirm_password", confirmPasswordRules(getValues))}
            placeholder="Confirm Password"
          />
        </div>
        <Button
          variant="default"
          className="mt-4"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </form>
    </div>
  )
}
export default ChangePassword
