import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Elements that reveal on scroll across the site. Tagged automatically (also when they
// arrive later from the API), so pages don't need to know about the motion system.
const REVEAL = [
  ['.section-heading > div, .section-heading > p, .section-heading > a', 'up'],
  ['.trust-grid > div', 'up'],
  ['.stats-grid .stat', 'up'],
  ['.steps article', 'up'],
  ['.category-card', 'up'],
  ['.lawyer-card', 'up'],
  ['.urgent', 'scale'],
  ['.footer-main > div', 'up'],
  ['.directory-lawyer', 'up'],
  ['.court-card', 'up'],
  ['.court-note, .enquiry-card, .court-data-source', 'up'],
  ['.magistrate-row', 'up'],
  ['.milestones > div', 'up'],
  ['.services-catalogue > div', 'up'],
  ['.guidance-card, .reviewed-card, .rules-panel', 'up'],
  ['.metric-grid article, .admin-metrics > div', 'up'],
  ['.alert-card, .privacy-banner, .matter-summary-bar', 'blur'],
  ['.dashboard-grid > .panel, .feed-aside > div', 'up'],
  ['.matter-row', 'left'],
  ['.feed-card, .offer-card', 'up'],
  ['.offer-detail, .order-summary, .next-event, .fee-snapshot', 'right'],
  ['.document-row', 'up'],
  ['.timeline-list > div', 'left'],
  ['main article.rounded-xl, main section.rounded-xl, main section.rounded-2xl', 'up'],
  ['.help-steps li, .help-contact-card, .faq-list .faq-item', 'up'],
  ['.legal-summary', 'blur'],
]
const SPOTLIGHT = '.category-card, .lawyer-card, .hero-panel, .feed-card, .offer-card, .court-card'
const TILT = '.lawyer-card, .category-card, .hero-panel'
const MAGNETIC = '.hero-actions .btn, .nav-actions .btn-primary, .urgent-actions .btn, .center .btn, .directory-cta .btn-primary'

const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const finePointer = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches

function tag(root, io) {
  for (const [selector, kind] of REVEAL) {
    root.querySelectorAll(selector).forEach((el) => {
      if (el.dataset.reveal || el.dataset.revealed || el.closest('[data-reveal]:not(.is-visible)')) return
      // Stagger siblings that share the same parent, capped so long lists don't drag.
      const siblings = Array.from(el.parentElement?.children ?? []).filter((c) => c.matches(selector))
      const index = Math.min(siblings.indexOf(el), 6)
      el.style.setProperty('--i', String(Math.max(0, index)))
      el.dataset.reveal = kind
      io.observe(el)
    })
  }
  if (finePointer() && !prefersReduced()) {
    root.querySelectorAll(SPOTLIGHT).forEach((el) => (el.dataset.spotlight = ''))
    root.querySelectorAll(TILT).forEach((el) => (el.dataset.tilt = ''))
    root.querySelectorAll(MAGNETIC).forEach((el) => (el.dataset.magnetic = ''))
  }
}

export function useMotion() {
  const { pathname } = useLocation()

  // Global listeners: set up once.
  useEffect(() => {
    const html = document.documentElement
    const reduced = prefersReduced()

    // Hide the first-load splash.
    const splash = document.getElementById('lb-splash')
    if (splash) {
      requestAnimationFrame(() => splash.classList.add('is-done'))
      setTimeout(() => splash.remove(), 900)
    }

    if (!('IntersectionObserver' in window) || reduced) {
      html.classList.remove('motion-ready')
    } else {
      html.classList.add('motion-ready')
    }

    // Scroll: progress bar, header state and a --scroll-y variable for light parallax.
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const max = document.documentElement.scrollHeight - window.innerHeight
        html.style.setProperty('--scroll-progress', max > 0 ? String(Math.min(1, y / max)) : '0')
        if (!reduced && y < 1200) html.style.setProperty('--scroll-y', String(Math.round(y)))
        html.classList.toggle('is-scrolled', y > 24)
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()

    if (reduced || !finePointer()) return () => window.removeEventListener('scroll', onScroll)

    // Pointer effects (desktop only): magnetic buttons, card tilt, cursor spotlight.
    let frame = 0
    let last = null
    const onMove = (e) => {
      last = e
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const t = last.target instanceof Element ? last.target : null
        if (!t) return
        const spot = t.closest('[data-spotlight]')
        if (spot) {
          const r = spot.getBoundingClientRect()
          spot.style.setProperty('--sx', `${last.clientX - r.left}px`)
          spot.style.setProperty('--sy', `${last.clientY - r.top}px`)
        }
        const tilt = t.closest('[data-tilt]')
        if (tilt) {
          const r = tilt.getBoundingClientRect()
          const px = (last.clientX - r.left) / r.width - 0.5
          const py = (last.clientY - r.top) / r.height - 0.5
          tilt.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`)
          tilt.style.setProperty('--ry', `${(px * 6).toFixed(2)}deg`)
        }
        const mag = t.closest('[data-magnetic]')
        if (mag) {
          const r = mag.getBoundingClientRect()
          mag.style.setProperty('--tx', `${((last.clientX - r.left - r.width / 2) * 0.22).toFixed(1)}px`)
          mag.style.setProperty('--ty', `${((last.clientY - r.top - r.height / 2) * 0.3).toFixed(1)}px`)
        }
      })
    }
    const onLeave = (e) => {
      const t = e.target instanceof Element ? e.target : null
      if (!t) return
      if (t.matches('[data-tilt]')) {
        t.style.setProperty('--rx', '0deg')
        t.style.setProperty('--ry', '0deg')
      }
      if (t.matches('[data-magnetic]')) {
        t.style.setProperty('--tx', '0px')
        t.style.setProperty('--ty', '0px')
      }
    }
    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave, true)
    return () => {
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave, true)
    }
  }, [])

  // Per route: observe reveal targets, including ones rendered later from API data.
  useEffect(() => {
    if (!document.documentElement.classList.contains('motion-ready')) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const el = entry.target
          el.classList.add('is-visible')
          io.unobserve(el)
          // Once settled, hand the element back to its normal hover/transform styles.
          const done = () => {
            el.removeAttribute('data-reveal')
            el.classList.remove('is-visible')
            el.dataset.revealed = '1'
          }
          const delay = Number(getComputedStyle(el).getPropertyValue('--i') || 0) * 70 + 1300
          setTimeout(done, delay)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
    const root = document.getElementById('root')
    tag(root, io)
    let pending = 0
    const mo = new MutationObserver(() => {
      if (pending) return
      pending = requestAnimationFrame(() => {
        pending = 0
        tag(root, io)
      })
    })
    mo.observe(root, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      io.disconnect()
      cancelAnimationFrame(pending)
    }
  }, [pathname])
}
