import * as React from "react"
import { LuEye, LuEyeOff } from "react-icons/lu"
import { Button } from "./button"
import { Input } from "./input"
import { InputElement, InputGroup } from "./input-group"

export const PasswordInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function PasswordInput(props, ref) {
    const [show, setShow] = React.useState(false)

    return (
      <InputGroup>
        <Input
          ref={ref}
          type={show ? "text" : "password"}
          className="pr-10"
          {...props}
        />
        <InputElement placement="right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShow(!show)}
            className="h-7 w-7 p-0 pointer-events-auto"
            type="button"
          >
            {show ? <LuEyeOff className="h-4 w-4" /> : <LuEye className="h-4 w-4" />}
          </Button>
        </InputElement>
      </InputGroup>
    )
  }
)
