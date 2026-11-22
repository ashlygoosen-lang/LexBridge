import { useEffect, useRef, useState } from 'react'

// Counts up to `value` the first time it scrolls into view. Server-rendered text is the
// final value, so crawlers, screen readers and reduced-motion users get the real number.
export function Counter({ value, format = (n) => n.toLocaleString('en-ZA'), duration = 1400 }) {
  const ref = useRef(null)
  const target = Number(value) || 0
  const [shown, setShown] = useState(target)

  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches || target === 0) {
      setShown(target)
      return
    }
    setShown(0)
    let raf = 0
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        const start = performance.now()
        const tick = (now) => {
          const p = Math.min(1, (now - start) / duration)
          const eased = 1 - Math.pow(1 - p, 4)
          setShown(Math.round(target * eased))
          if (p < 1) raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [target, duration])

  return (
    <span ref={ref} data-counter aria-label={format(target)}>
      <span aria-hidden="true">{format(shown)}</span>
    </span>
  )
}
