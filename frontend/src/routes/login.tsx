import { Input } from "@/components/ui/input"
import {
  createFileRoute,
  Link as RouterLink,
  redirect,
} from "@tanstack/react-router"
import { type SubmitHandler, useForm } from "react-hook-form"

import type { Body_login_login_access_token as AccessToken } from "@/client"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { InputGroup } from "@/components/ui/input-group"
import { PasswordInput } from "@/components/ui/password-input"
import useAuth, { isLoggedIn } from "@/hooks/useAuth"
import Logo from "/assets/images/fastapi-logo.svg"
import { emailPattern, passwordRules } from "../utils"

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
  const { loginMutation, resetError } = useAuth()
  const {
    register,
    handleSubmit,
    formState: {  isSubmitting },
  } = useForm<AccessToken>({
    mode: "onBlur",
    criteriaMode: "all",
    defaultValues: {
      username: "",
      password: "",
    },
  })

  const onSubmit: SubmitHandler<AccessToken> = async (data) => {
    if (isSubmitting) return

    resetError()

    try {
      await loginMutation.mutateAsync(data)
    } catch {
      // error is handled by useAuth hook
    }
  }

  return (
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
            {...register("username", {
              required: "Username is required",
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
      <RouterLink to="/recover-password" className="main-link">
        Forgot Password?
      </RouterLink>
      <Button variant="default" type="submit" disabled={isSubmitting} >
        Log In
      </Button>
      <p>
        Don't have an account?{" "}
        <RouterLink to="/signup" className="main-link">
          Sign Up
        </RouterLink>
      </p>
    </form>
  )
}
