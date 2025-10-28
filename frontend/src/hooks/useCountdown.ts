import { useEffect, useState } from "react"

export function useCountdown(dueDate: string) {
  const [timeLeft, setTimeLeft] = useState<string>("")
  const [isPastDue, setIsPastDue] = useState<boolean>(false)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now()
      const due = new Date(dueDate).getTime()
      const diff = due - now

      if (diff <= 0) {
        setTimeLeft("Past Due")
        setIsPastDue(true)
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor(
        (diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
      )
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`)
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`)
      } else {
        setTimeLeft(`${seconds}s`)
      }

      setIsPastDue(false)
    }

    calculateTimeLeft()
    const interval = setInterval(calculateTimeLeft, 1000) // Update every second

    return () => clearInterval(interval)
  }, [dueDate])

  return { timeLeft, isPastDue }
}
