import { useTheme } from "next-themes"

import { Radio, RadioGroup } from "@/components/ui/radio"

const Appearance = () => {
  const { theme, setTheme } = useTheme()

  return (
    <div className="max-w-full">
      <h3 className="text-sm font-semibold py-4">
        Appearance
      </h3>

      <RadioGroup
        onValueChange={(e) => setTheme(e ?? "system")}
        value={theme}
      >
        <div className="flex flex-col gap-2">
          <Radio value="system">System</Radio>
          <Radio value="light">Light Mode</Radio>
          <Radio value="dark">Dark Mode</Radio>
        </div>
      </RadioGroup>
    </div>
  )
}
export default Appearance
