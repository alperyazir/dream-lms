import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"
import type { UserRegister } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import { confirmPasswordRules, emailPattern, passwordRules } from "@/utils"
import Logo from "/assets/images/fastapi-logo.svg"

export const Route = createFileRoute("/signup")({
  component: SignUp,
  beforeLoad: async () => {
    if (isLoggedIn()) {
      throw redirect({
        to: "/",
      })
    }
  },
})

interface UserRegisterForm extends UserRegister {
  confirm_password: string
}

function SignUp() {
  const { signUpMutation } = useAuth()
  const {
    register,
    handleSubmit,
    getValues,
    formState: { isSubmitting },
  } = useForm<UserRegisterForm>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      email: "",
      full_name: "",
      password: "",
      confirm_password: "",
    },
  })

  const onSubmit: SubmitHandler<UserRegisterForm> = (data) => {
    signUpMutation.mutate(data)
  }

  return (
    <div className="flex flex-col md:flex-row justify-center h-screen">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="h-screen max-w-sm flex flex-col items-stretch justify-center gap-4 mx-auto px-4"
      >
        <img
          src={Logo}
          alt="FastAPI logo"
          className="h-auto max-w-xs self-center mb-4"
        />
        <Field
        /* invalid prop removed */
        >
          <InputGroup className="w-full">
            <Input
              minLength={3}
              {...register("full_name", {
                required: "Full Name is required",
              })}
              placeholder="Full Name"
              type="text"
            />
          </InputGroup>
        </Field>

        <Field>
          <InputGroup className="w-full">
            <Input
              {...register("email", {
                required: "Email is required",
                pattern: emailPattern,
              })}
              placeholder="Email"
              type="email"
            />
          </InputGroup>
        </Field>
        <PasswordInput
          type="password"
          {...register("password", passwordRules())}
          placeholder="Password"
        />
        <PasswordInput
          type="confirm_password"
          {...register("confirm_password", confirmPasswordRules(getValues))}
          placeholder="Confirm Password"
        />
        <Button variant="default" type="submit" disabled={isSubmitting}>
          Sign Up
        </Button>
        <p>
          Already have an account?{" "}
          <RouterLink to="/login" className="main-link">
            Log In
          </RouterLink>
        </p>
      </form>
    </div>
  )
}

export default SignUp
