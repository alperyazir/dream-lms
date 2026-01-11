"use client"

import { toast } from "@/hooks/use-toast"

export const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    toast({
      title: "Success!",
      description,
      variant: "default",
    })
  }

  const showErrorToast = (description: string) => {
    toast({
      title: "Something went wrong!",
      description,
      variant: "destructive",
    })
  }

  return { showSuccessToast, showErrorToast }
}

export default useCustomToast
