"""Checks the motion system: hero choreography, reveals never leave content hidden,
no layout shift, reduced-motion shows everything instantly, touch devices get no tilt."""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4100'
OUT = '/home/claude/tests/shots'
fails = []


def ok(cond, label):
    print(('  ✓ ' if cond else '  ✗ ') + label)
    if not cond:
        fails.append(label)


HIDDEN_JS = """() => [...document.querySelectorAll('#root *')].filter(el => {
  const s = getComputedStyle(el); const r = el.getBoundingClientRect();
  return r.width > 40 && r.height > 20 && parseFloat(s.opacity) < 0.5 && el.closest('[data-reveal],[data-revealed]');
}).map(el => el.className.toString().slice(0, 60))"""

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])

    print('Desktop')
    page = b.new_page(viewport={'width': 1440, 'height': 900})
    page.add_init_script("""window.__cls = 0; new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value }).observe({type: 'layout-shift', buffered: true});""")
    page.goto(BASE + '/')
    prev = 0
    for ms in (150, 600, 1300, 2600):
        page.wait_for_timeout(ms - prev)
        prev = ms
        page.screenshot(path=f'{OUT}/hero_{ms}ms.png')
    ok(page.evaluate("document.documentElement.classList.contains('motion-ready')"), 'motion system active')
    ok(page.locator('#lb-splash').count() == 0, 'splash removed after load')
    tagged = page.evaluate("document.querySelectorAll('[data-reveal]').length")
    ok(tagged > 10, f'{tagged} elements tagged for scroll reveal')
    ok(page.evaluate("document.querySelectorAll('[data-tilt]').length") >= 1, 'tilt enabled on desktop')
    # Scroll the whole page slowly, then confirm nothing remains hidden.
    h = page.evaluate('document.body.scrollHeight')
    for y in range(0, h, 400):
        page.mouse.wheel(0, 400)
        page.wait_for_timeout(120)
    page.wait_for_timeout(1800)
    ok(page.evaluate("document.documentElement.classList.contains('is-scrolled')"), 'header switches to compact state on scroll')
    progress = float(page.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--scroll-progress')") or 0)
    ok(progress > 0.9, f'scroll progress bar reaches the end ({progress:.2f})')
    hidden = page.evaluate(HIDDEN_JS)
    ok(not hidden, f'no content left hidden after scrolling ({hidden[:3]})')
    counts = page.locator('.stats-grid .stat b').all_inner_texts()
    ok(counts[1].strip() == '151' and counts[2].strip().replace(' ', ' ') in ('1 800', '1,800', '1800'), f'counters land on real values {counts}')
    cls = page.evaluate('window.__cls')
    ok(cls < 0.1, f'cumulative layout shift {cls:.3f} (< 0.1 is "good")')
    page.evaluate('window.scrollTo(0, 0)')
    page.wait_for_timeout(600)
    card = page.locator('.lawyer-card').first
    card.scroll_into_view_if_needed()
    page.wait_for_timeout(1600)
    box = card.bounding_box()
    page.mouse.move(box['x'] + box['width'] * 0.85, box['y'] + box['height'] * 0.2)
    page.wait_for_timeout(700)
    tf = card.evaluate('el => getComputedStyle(el).transform')
    ok(tf not in ('none', 'matrix(1, 0, 0, 1, 0, 0)'), 'lawyer card tilts and lifts under the cursor')
    page.screenshot(path=f'{OUT}/hover_card.png')
    page.mouse.move(5, 5)

    # Route transition + portal pages keep working
    page.goto(BASE + '/lawyers')
    page.wait_for_timeout(1500)
    onscreen = page.evaluate("""() => [...document.querySelectorAll('[data-reveal],[data-revealed]')].filter(e => {
      const r = e.getBoundingClientRect(); return r.top < innerHeight * 0.85 && r.bottom > 0 && parseFloat(getComputedStyle(e).opacity) < 0.5 }).length""")
    ok(onscreen == 0, 'on-screen directory cards revealed (off-screen ones wait for scroll)')
    page.screenshot(path=f'{OUT}/directory_motion.png')

    print('Reduced motion')
    rm = b.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce').new_page()
    rm.goto(BASE + '/')
    rm.wait_for_timeout(300)
    ok(not rm.evaluate("document.documentElement.classList.contains('motion-ready')"), 'reveals disabled')
    op = rm.evaluate("getComputedStyle(document.querySelector('.category-card')).opacity")
    ok(op == '1', 'content fully visible immediately')
    ok(rm.locator('.stats-grid .stat b').nth(1).inner_text().strip() == '151', 'counters show final value instantly')
    ok(rm.evaluate("getComputedStyle(document.querySelector('.hero-orbit')).animationName") == 'none', 'ambient animation stopped')

    print('Mobile')
    m = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True).new_page()
    m.goto(BASE + '/')
    m.wait_for_timeout(2600)
    ok(m.evaluate("document.querySelectorAll('[data-tilt],[data-magnetic]').length") == 0, 'no tilt or magnetic effects on touch')
    m.screenshot(path=f'{OUT}/mobile_hero.png')
    m.click('.menu-btn')
    m.wait_for_timeout(700)
    m.screenshot(path=f'{OUT}/mobile_menu.png')
    ok(m.locator('.nav-links.open').is_visible(), 'mobile menu opens with animation')
    b.close()

print('\n' + ('✓ motion checks passed' if not fails else f'✗ {len(fails)} failed: {fails}'))
sys.exit(1 if fails else 0)
