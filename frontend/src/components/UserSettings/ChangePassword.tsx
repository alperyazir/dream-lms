import { useMutation } from "@tanstack/react-query"
import { KeyRound, Save } from "lucide-react"
import { type SubmitHandler, useForm } from "react-hook-form"
import { type ApiError, type UpdatePassword, UsersService } from "@/client"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
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
    formState: { isSubmitting, errors },
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
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <KeyRound className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">Change Password</h3>
          <p className="text-sm text-muted-foreground">
            Update your password to keep your account secure
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="space-y-2">
          <Label htmlFor="current_password">Current Password</Label>
          <PasswordInput
            id="current_password"
            type="current_password"
            {...register("current_password", passwordRules())}
            placeholder="Enter your current password"
          />
          {errors.current_password && (
            <p className="text-sm text-destructive">{errors.current_password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="new_password">New Password</Label>
          <PasswordInput
            id="new_password"
            type="new_password"
            {...register("new_password", passwordRules())}
            placeholder="Enter your new password"
          />
          {errors.new_password && (
            <p className="text-sm text-destructive">{errors.new_password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm_password">Confirm New Password</Label>
          <PasswordInput
            id="confirm_password"
            type="confirm_password"
            {...register("confirm_password", confirmPasswordRules(getValues))}
            placeholder="Confirm your new password"
          />
          {errors.confirm_password && (
            <p className="text-sm text-destructive">{errors.confirm_password.message}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="mt-2">
          <Save className="h-4 w-4 mr-2" />
          {isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </form>
    </div>
  )
}

export default ChangePassword
