"use client"

import { type PropsWithChildren } from "react"
import { ThemeProvider } from "next-themes"

export function CustomProvider(props: PropsWithChildren) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
      {props.children}
    </ThemeProvider>
  )
}
