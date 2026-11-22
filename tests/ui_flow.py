"""Clicks through the real hire flow in the browser: post matter, lawyer offers, accept, pay, schedule, sign, message."""
from playwright.sync_api import sync_playwright, expect

BASE = 'http://localhost:4100'
D = 'demo.callmylawyer.co.za'
OUT = '/home/claude/tests/shots'


def login(page, who):
    page.goto(BASE + '/login')
    page.fill('input[type=email]', f'{who}@{D}')
    page.fill('input[type=password]', 'Demo@2025!')
    page.click('button[type=submit]')
    page.wait_for_timeout(800)


with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    errors = []

    # 1. Client posts a matter through the modal
    c = b.new_context(viewport={'width': 1440, 'height': 900}).new_page()
    c.on('pageerror', lambda e: errors.append(str(e)))
    login(c, 'sipho')
    c.click('text=Post a new matter')
    c.click('text=I am being sued')
    c.click('text=Continue')
    c.fill('input[maxlength="140"]', 'Landlord claiming unpaid rent')
    c.fill('textarea', 'My former landlord issued a summons for three months of rent I already paid in cash.')
    c.select_option('select >> nth=0', 'Gauteng')
    c.click('text=Continue')
    c.screenshot(path=f'{OUT}/flow_1_review.png')
    c.click('text=Post my matter')
    c.wait_for_url('**/matters/*?posted=1')
    matter_url = c.url.split('?')[0]
    matter_id = matter_url.rsplit('/', 1)[1]
    expect(c.locator('text=is live')).to_be_visible()
    print('1 ✓ client posted matter', matter_id)

    # 2. Lawyer sends an offer from the matter page
    l = b.new_context(viewport={'width': 1440, 'height': 900}).new_page()
    l.on('pageerror', lambda e: errors.append(str(e)))
    login(l, 'thabo')
    l.goto(f'{BASE}/lawyer')
    expect(l.locator('text=Landlord claiming unpaid rent')).to_be_visible()
    l.goto(f'{BASE}/matters/{matter_id}')
    l.fill('input[name=consultFee]', '850')
    l.fill('input[placeholder="e.g. Court appearance"]', 'Notice of intention to defend')
    l.fill('input[placeholder="R"]', '2500')
    l.fill('textarea[name=note]', 'I defend rental claims often and can file the notice this week.')
    expect(l.locator('text=Estimated total shown to client: R 3 350,00')).to_be_visible()
    l.click('text=Send offer')
    expect(l.locator('text=YOUR OFFER')).to_be_visible()
    print('2 ✓ lawyer sent offer (live total R 3 350,00)')

    # 3. Client compares and accepts
    c.goto(f'{BASE}/matters/{matter_id}')
    expect(c.locator('text=Thabo Mokoena').first).to_be_visible()
    c.screenshot(path=f'{OUT}/flow_2_offers.png')
    c.once('dialog', lambda d: d.accept())
    c.click('button:has-text("Accept offer")')
    c.wait_for_url('**/checkout')
    print('3 ✓ client accepted offer → checkout')

    # 4. Pay, schedule, sign
    c.click('button:has-text("Pay R 850,00")')
    expect(c.locator('text=Select your consultation.')).to_be_visible()
    c.locator('.time-grid button:not([disabled])').first.click()
    c.screenshot(path=f'{OUT}/flow_3_schedule.png')
    c.click('text=Confirm consultation')
    expect(c.locator('text=Mandate and fee agreement')).to_be_visible()
    c.check('.mandate-card input[type=checkbox]')
    c.fill('.signature-box input', 'Sipho Ndlovu')
    c.screenshot(path=f'{OUT}/flow_4_mandate.png')
    c.click('text=Sign mandate')
    c.wait_for_url('**/workspace?signed=1')
    print('4 ✓ paid, scheduled and signed → workspace')

    # 5. Messaging both ways
    c.click('.workspace-tabs >> text=Messages')
    c.fill('.chat-input input', 'Thank you — I have the receipts for the cash payments.')
    c.click('.chat-input button[type=submit]')
    expect(c.locator('text=I have the receipts')).to_be_visible()
    l.goto(f'{BASE}/matters/{matter_id}/workspace?tab=Messages')
    expect(l.locator('text=I have the receipts')).to_be_visible()
    expect(l.locator('text=sipho@demo')).to_be_visible()
    l.screenshot(path=f'{OUT}/flow_5_lawyer_chat.png')
    print('5 ✓ message delivered; lawyer sees client contact after mandate')

    # 6. Mobile layout
    m = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True).new_page()
    m.goto(BASE + '/')
    m.screenshot(path=f'{OUT}/mobile_home.png')
    m.goto(BASE + '/police-stations')
    m.screenshot(path=f'{OUT}/mobile_stations.png')

    print('page errors:', errors or 'none')
    b.close()
