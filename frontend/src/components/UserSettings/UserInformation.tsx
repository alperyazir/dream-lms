import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { type SubmitHandler, useForm } from "react-hook-form"
import {
  type ApiError,
  type UserPublic,
  UsersService,
  type UserUpdateMe,
} from "@/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import useAuth from "@/hooks/useAuth"
import useCustomToast from "@/hooks/useCustomToast"
import { emailPattern, handleError } from "@/utils"
import { Field } from "../ui/field"

const UserInformation = () => {
  const queryClient = useQueryClient()
  const { showSuccessToast } = useCustomToast()
  const [editMode, setEditMode] = useState(false)
  const { user: currentUser } = useAuth()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { isSubmitting, errors, isDirty },
  } = useForm<UserPublic>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      full_name: currentUser?.full_name,
      email: currentUser?.email,
    },
  })

  const toggleEditMode = () => {
    setEditMode(!editMode)
  }

  const mutation = useMutation({
    mutationFn: (data: UserUpdateMe) =>
      UsersService.updateUserMe({ requestBody: data }),
    onSuccess: () => {
      showSuccessToast("User updated successfully.")
    },
    onError: (err: ApiError) => {
      handleError(err)
    },
    onSettled: () => {
      queryClient.invalidateQueries()
    },
  })

  const onSubmit: SubmitHandler<UserUpdateMe> = async (data) => {
    mutation.mutate(data)
  }

  const onCancel = () => {
    reset()
    toggleEditMode()
  }

  return (
    <div className="max-w-full">
      <h3 className="text-sm font-semibold py-4">User Information</h3>
      <form className="w-full md:w-96" onSubmit={handleSubmit(onSubmit)}>
        <Field label="Full name">
          {editMode ? (
            <Input {...register("full_name", { maxLength: 30 })} type="text" />
          ) : (
            <p
              className="text-base py-2 truncate max-w-sm"
              style={{ color: !currentUser?.full_name ? "gray" : "inherit" }}
            >
              {currentUser?.full_name || "N/A"}
            </p>
          )}
        </Field>
        <Field className="mt-4" label="Email" error={errors.email?.message}>
          {editMode ? (
            <Input
              {...register("email", {
                required: "Email is required",
                pattern: emailPattern,
              })}
              type="email"
            />
          ) : (
            <p className="text-base py-2 truncate max-w-sm">
              {currentUser?.email}
            </p>
          )}
        </Field>
        <div className="mt-4 flex gap-3">
          <Button
            variant="default"
            onClick={toggleEditMode}
            type={editMode ? "button" : "submit"}
            disabled={
              editMode ? !isDirty || !getValues("email") || isSubmitting : false
            }
          >
            {editMode ? (isSubmitting ? "Saving..." : "Save") : "Edit"}
          </Button>
          {editMode && (
            <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

export default UserInformation
