import { useEffect, useRef, useCallback } from "react"
import { useTheme } from "next-themes"

interface WaveAnimationProps {
  className?: string
}

interface Wave {
  y: number
  length: number
  amplitude: number
  frequency: number
  speed: number
  phase: number
  colorLight: string  // Color for light mode
  colorDark: string   // Color for dark mode
  lineWidth: number
}

interface Particle {
  x: number
  baseY: number
  waveIndex: number
  speed: number
  size: number
  opacity: number
}

export function WaveAnimation({ className = "" }: WaveAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const wavesRef = useRef<Wave[]>([])
  const particlesRef = useRef<Particle[]>([])
  const dimensionsRef = useRef({ width: 0, height: 0 })
  const { resolvedTheme } = useTheme()

  const initWaves = useCallback((height: number) => {
    // Light mode: white/light colors that contrast with teal gradient
    // Dark mode: teal/cyan colors that contrast with dark background
    const waveConfigs = [
      { light: "rgba(255, 255, 255, 0.7)", dark: "rgba(20, 184, 166, 0.6)" },
      { light: "rgba(255, 255, 255, 0.6)", dark: "rgba(6, 182, 212, 0.5)" },
      { light: "rgba(255, 255, 255, 0.5)", dark: "rgba(13, 148, 136, 0.4)" },
      { light: "rgba(255, 255, 255, 0.55)", dark: "rgba(8, 145, 178, 0.5)" },
      { light: "rgba(255, 255, 255, 0.4)", dark: "rgba(20, 184, 166, 0.3)" },
      { light: "rgba(255, 255, 255, 0.5)", dark: "rgba(6, 182, 212, 0.4)" },
      { light: "rgba(255, 255, 255, 0.35)", dark: "rgba(45, 212, 191, 0.3)" },
    ]

    wavesRef.current = waveConfigs.map((colors, index) => ({
      y: height * 0.4 + (index * 15),
      length: 0.008 + (index * 0.002),
      amplitude: 20 + (index * 8),
      frequency: 0.02 + (index * 0.005),
      speed: 0.02 + (index * 0.008),
      phase: index * 0.5,
      colorLight: colors.light,
      colorDark: colors.dark,
      lineWidth: 1.5 - (index * 0.1),
    }))
  }, [])

  const initParticles = useCallback((width: number) => {
    const particleCount = 40
    particlesRef.current = []

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * width,
        baseY: 0,
        waveIndex: Math.floor(Math.random() * 7),
        speed: 30 + Math.random() * 40,
        size: 2 + Math.random() * 3,
        opacity: 0.4 + Math.random() * 0.6,
      })
    }
  }, [])

  const getWaveY = useCallback((x: number, wave: Wave, time: number): number => {
    const dx = x * wave.length
    const offsetY = Math.sin(dx + time * wave.speed + wave.phase) * wave.amplitude
    const offsetY2 = Math.sin(dx * 0.5 + time * wave.speed * 0.8) * (wave.amplitude * 0.5)
    return wave.y + offsetY + offsetY2
  }, [])

  const drawWave = useCallback((
    ctx: CanvasRenderingContext2D,
    wave: Wave,
    width: number,
    time: number,
    isDark: boolean
  ) => {
    ctx.beginPath()
    ctx.strokeStyle = isDark ? wave.colorDark : wave.colorLight
    ctx.lineWidth = wave.lineWidth

    for (let x = 0; x < width; x++) {
      const y = getWaveY(x, wave, time)

      if (x === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }

    ctx.stroke()
  }, [getWaveY])

  const updateAndDrawParticles = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    time: number,
    deltaTime: number,
    isDark: boolean
  ) => {
    for (const particle of particlesRef.current) {
      particle.x += particle.speed * deltaTime

      if (particle.x > width) {
        particle.x = -10
        particle.waveIndex = Math.floor(Math.random() * wavesRef.current.length)
      }

      const wave = wavesRef.current[particle.waveIndex]
      if (!wave) continue

      const y = getWaveY(particle.x, wave, time)

      // Different particle colors for light/dark mode
      const gradient = ctx.createRadialGradient(
        particle.x, y, 0,
        particle.x, y, particle.size * 2
      )

      if (isDark) {
        gradient.addColorStop(0, `rgba(6, 182, 212, ${particle.opacity})`)
        gradient.addColorStop(0.5, `rgba(20, 184, 166, ${particle.opacity * 0.5})`)
        gradient.addColorStop(1, "rgba(20, 184, 166, 0)")
      } else {
        // Light mode: white/cream glow
        gradient.addColorStop(0, `rgba(255, 255, 255, ${particle.opacity})`)
        gradient.addColorStop(0.5, `rgba(255, 255, 255, ${particle.opacity * 0.6})`)
        gradient.addColorStop(1, "rgba(255, 255, 255, 0)")
      }

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(particle.x, y, particle.size * 2, 0, Math.PI * 2)
      ctx.fill()

      // Core dot
      ctx.fillStyle = isDark
        ? `rgba(255, 255, 255, ${particle.opacity * 0.8})`
        : `rgba(255, 255, 255, ${particle.opacity})`
      ctx.beginPath()
      ctx.arc(particle.x, y, particle.size * 0.5, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [getWaveY])

  const lastTimeRef = useRef<number>(0)
  const themeRef = useRef<string | undefined>(resolvedTheme)

  // Update theme ref when it changes
  useEffect(() => {
    themeRef.current = resolvedTheme
  }, [resolvedTheme])

  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { width, height } = dimensionsRef.current
    const isDark = themeRef.current === "dark"

    const deltaTime = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016
    lastTimeRef.current = time

    ctx.clearRect(0, 0, width, height)

    const timeInSeconds = time / 1000

    for (const wave of wavesRef.current) {
      drawWave(ctx, wave, width, timeInSeconds, isDark)
    }

    updateAndDrawParticles(ctx, width, timeInSeconds, deltaTime, isDark)

    animationRef.current = requestAnimationFrame(animate)
  }, [drawWave, updateAndDrawParticles])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (prefersReducedMotion) {
      return
    }

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (!parent) return

      const dpr = window.devicePixelRatio || 1
      const rect = parent.getBoundingClientRect()

      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.scale(dpr, dpr)
      }

      dimensionsRef.current = { width: rect.width, height: rect.height }
      initWaves(rect.height)
      initParticles(rect.width)
    }

    resizeCanvas()
    window.addEventListener("resize", resizeCanvas)

    animationRef.current = requestAnimationFrame(animate)

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current)
          animationRef.current = null
        }
        lastTimeRef.current = 0
      } else {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      window.removeEventListener("resize", resizeCanvas)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate, initWaves, initParticles])

  return (
    <div className={`absolute bottom-0 left-0 right-0 h-[12vh] min-h-[80px] max-h-[200px] overflow-hidden ${className}`}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        aria-hidden="true"
      />
    </div>
  )
}
