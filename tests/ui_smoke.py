"""Visits every route as the relevant role, records console errors and saves screenshots."""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4100'
OUT = '/home/claude/tests/shots'
D = 'demo.lexbridge.co.za'
PW = 'Demo@2025!'

ROUTES = {
    None: ['/', '/lawyers', '/lawyers/5', '/courts', '/magistrates', '/fees', '/police-stations', '/help', '/legal/terms', '/legal/refunds', '/legal/privacy', '/legal/cookies', '/legal/paia', '/legal/practitioners', '/legal/disclaimer', '/legal/company', '/terms', '/refunds', '/login', '/login?mode=signup', '/nope'],
    'naledi': ['/client', '/matters', '/matters/1', '/matters/2/workspace', '/matters/2/workspace?tab=Messages', '/matters/2/workspace?tab=Documents',
               '/matters/2/workspace?tab=Fees+%26+invoices', '/matters/2/workspace?tab=Mandate', '/payments', '/police-report', '/police-report/1', '/dashboard', '/account', '/fees'],
    'thabo': ['/lawyer', '/matters/3', '/lawyer/offers', '/matters', '/matters/2/workspace', '/payments', '/lawyer/profile'],
    'lerato': ['/lawyer', '/lawyer/profile'],
    'admin': ['/admin', '/admin?tab=moderation', '/admin?tab=payments', '/admin?tab=users', '/admin?tab=cases', '/admin?tab=identity', '/admin?tab=stations'],
    'saps': ['/dashboard'],
    'clerk': ['/dashboard'],
    'legalaid': ['/dashboard'],
}

problems = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for who, routes in ROUTES.items():
        ctx = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = ctx.new_page()
        errors = []
        page.on('console', lambda m: m.type == 'error' and errors.append(m.text))
        page.on('pageerror', lambda e: errors.append(f'PAGEERROR {e}'))
        if who:
            page.goto(BASE + '/login')
            page.fill('input[type=email]', f'{who}@{D}')
            page.fill('input[type=password]', PW)
            page.click('button[type=submit]')
            page.wait_for_timeout(1200)
        for r in routes:
            errors.clear()
            page.goto(BASE + r)
            page.wait_for_timeout(900)
            # Ignore remote image/font failures (sandbox has no internet).
            errs = [e for e in errors if 'Failed to load resource' not in e and 'ERR_' not in e]
            body = page.inner_text('body')
            crashed = len(body.strip()) < 40
            name = f"{who or 'public'}_{r.strip('/').replace('/', '_').replace('?', '_').replace('=', '-').replace('&', '_').replace('%', '') or 'home'}"
            page.screenshot(path=f'{OUT}/{name}.png', full_page=False)
            status = 'OK' if not errs and not crashed else 'PROBLEM'
            if status != 'OK':
                problems.append((who, r, errs[:3], crashed))
            print(f'{status:8} {who or "public":8} {r:45} {page.url.replace(BASE, "")}')
        ctx.close()
    browser.close()

print('\nProblems:' if problems else '\nNo console errors or blank pages.')
for pr in problems:
    print(pr)
