import os
import shutil
"""Synthetic end-to-end transcript and guided-advising checks. No student data."""
import json
import tempfile
import threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

root=Path(__file__).resolve().parents[1]
out=root/'artifacts';out.mkdir(exist_ok=True)
tmp=tempfile.TemporaryDirectory(prefix='kit-synthetic-')
pdf=Path(tmp.name)/'synthetic-transcript.pdf'
pdfmetrics.registerFont(TTFont('FixtureKR',str(root/'data/NotoSansKR-Guide.ttf')))
c=canvas.Canvas(str(pdf));c.setFont('FixtureKR',12)
lines=['성적증명서', '입학일: 2024년 3월 1일', '2025학년도 제1학기',
       '전필 창의설계입문 3 A+', '전필 컴퓨터원용제도 2 B+', '교필 공학수학1 3 B',
       '교필 글쓰기와발표 2 A', '교선 체육 1 P', '전선 열역학 3 F',
       '총 취득학점: 11', '총 평점평균: 3.50',
       '이 문서는 기능 검증용 가상 이수내역입니다. 실제 학생의 개인정보가 아닙니다.']
for i,line in enumerate(lines):c.drawString(50,790-i*24,line)
c.save()
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',4176),partial(Quiet,directory=str(root/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
 browser=pw.chromium.launch(executable_path=os.environ.get('KIT_CHROMIUM_EXECUTABLE') or shutil.which('chromium'),headless=True,args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1440,'height':1000})
 errors=[];writes=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:writes.append(r.url) if r.method not in ['GET','HEAD'] else None)
 page.goto('http://127.0.0.1:4176',wait_until='networkidle')
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.screenshot(path=str(out/'updated-home.png'),full_page=True)
 page.locator('[data-start-advisor]').click()
 assert '성적표 PDF를 올려주실 수 있나요?' in page.locator('#guided-panel').inner_text()
 page.locator('#transcript-file').set_input_files(str(pdf))
 page.locator('#advisor-profile').wait_for(timeout=45000)
 page.locator('#guide-entry').select_option('2024')
 page.locator('#guide-grade').select_option('3');page.locator('#guide-semester').select_option('2')
 page.locator('#guide-certification').select_option('certified')
 page.locator('#advisor-profile button[type=submit]').click()
 assert page.locator('#transcript-review').is_visible()
 assert '6개 행' in page.locator('.review-total').inner_text()
 page.locator('#review-total').fill('13')
 page.locator('#review-confirmed').check();page.locator('#review-apply').click()
 assert '달라요' in page.locator('#review-errors').inner_text()
 page.locator('#review-total').fill('11')
 page.locator('#review-confirmed').check();page.locator('#review-apply').click()
 assert '이번 학기에 듣는 과목' in page.locator('#guided-panel').inner_text()
 page.locator('[data-advisor="current-confirm"]').click()
 assert '현재 수강 없음' in page.locator('#guided-error').inner_text()
 page.locator('#guided-search').fill('기계공작법')
 page.locator('[data-guided-course="CA1012"]').check()
 page.locator('[data-advisor="current-confirm"]').click()
 page.locator('[data-goal="ssu"]').check();page.locator('[data-goal="analysis"]').check()
 page.locator('[data-goal-status=ssu]').select_option('inprogress')
 page.locator('[data-advisor="goals-confirm"]').click()
 summary=page.locator('#guided-panel').inner_text()
 assert '총학점\n11' in summary and '전공 합계\n5' in summary and 'MSC\n3' in summary
 assert '현재 수강' not in summary or '3학점' in summary
 saved=page.evaluate('JSON.parse(localStorage.getItem("kumoh-me-guide-v1"))')
 assert not any('academic' in r for r in saved['records'].values())
 page.screenshot(path=str(out/'guided-summary.png'),full_page=True)
 page.locator('#home-button').click();page.locator('#resume-chat').click()
 assert '지금은 이 네 가지만' in page.locator('#guided-panel').inner_text()
 page.locator('[data-advisor="required"]').click()
 assert '수강 중' in page.locator('#guided-panel').inner_text() or page.locator('[data-advisor="required-next"]').count()
 page.locator('[data-advisor="summary"]').first.click()
 page.locator('[data-advisor="plan"]').click()
 assert page.locator('#advisor-plan-year').input_value()==''
 assert page.locator('#advisor-plan-semester').input_value()==''
 page.locator('#advisor-plan button[type=submit]').click()
 assert '연도와 학기' in page.locator('#guided-error').inner_text()
 page.locator('#advisor-plan-year').select_option('2027')
 page.locator('#advisor-plan-semester').select_option('1')
 page.locator('#advisor-plan-grade').select_option('4')
 page.locator('#advisor-plan button[type=submit]').click()
 assert '2027학년도 1학기 수강 후보' in page.locator('#guided-panel').inner_text()
 assert '교양 6학점 자리 확보' in page.locator('#guided-panel').inner_text()
 assert '창의설계입문' not in page.locator('.brief-course-list').inner_text()
 with page.expect_download() as dl:page.locator('[data-advisor="download"]').click()
 dl.value.save_as(out/'guided-plan.txt')
 assert '편성학기 기준' in (out/'guided-plan.txt').read_text('utf-8-sig')
 page.locator('[data-advisor="summary"]').last.click()
 page.locator('[data-advisor="compare"]').click()
 assert '비인증 가정' in page.locator('#guided-panel').inner_text()
 page.locator('[data-advisor="plan-noncertified"]').click()
 assert page.locator('#advisor-plan-route').input_value()=='noncertified'
 assert page.locator('#certification').input_value()=='certified'
 page.locator('#chat-input').fill('인증 포기하면 어때?');page.locator('#chat-input').press('Enter')
 assert page.locator('#certification').input_value()=='certified'
 # Consent is optional and remembered across review pages; no raw PDF retained.
 page.locator('[data-advisor="summary"]').click();page.locator('[data-advisor="review"]').click()
 page.locator('#review-save-local').check();page.locator('[data-review-page="1"]').click()
 assert page.locator('#review-save-local').is_checked()
 page.locator('#review-confirmed').check();page.locator('#review-apply').click()
 persisted=page.evaluate('localStorage.getItem("kumoh-me-guide-v1")')
 page.reload(wait_until='networkidle');page.locator('[data-start-advisor]').click()
 page.locator('[data-advisor="summary"]').click()
 assert '총학점\n11' in page.locator('#guided-panel').inner_text()
 assert 'synthetic-transcript.pdf' not in page.evaluate('localStorage.getItem("kumoh-me-guide-v1")')
 page.locator('[data-advisor="delete-academic"]').click()
 assert not any('academic' in r for r in page.evaluate('JSON.parse(localStorage.getItem("kumoh-me-guide-v1"))').get('records',{}).values())
 # Manual path begins at 1-1, keeps a draft when home/resume, and waits for every term.
 page.locator('[data-advisor="manual"]').click()
 page.locator('#guide-grade').select_option('2');page.locator('#guide-semester').select_option('1')
 page.locator('#advisor-profile button[type=submit]').click()
 assert '1학년 1학기' in page.locator('#guided-panel').inner_text()
 page.locator('[data-guided-course="CA0001"]').check()
 page.locator('#home-button').click();page.locator('#resume-chat').click()
 assert page.locator('[data-guided-course="CA0001"]').is_checked()
 page.locator('[data-advisor="manual-next"]').click()
 assert '1학년 2학기' in page.locator('#guided-panel').inner_text()
 page.locator('[data-advisor="manual-empty"]').click()
 page.locator('#review-confirmed').check();page.locator('#review-apply').click()
 page.locator('[data-advisor="current-empty"]').click()
 page.locator('[data-advisor="goals-confirm"]').click()
 assert '총학점\n3' in page.locator('#guided-panel').inner_text()
 # Compact answers and mobile guided cards.
 mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
 mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto('http://127.0.0.1:4176',wait_until='networkidle')
 mobile.locator('[data-start-advisor]').click()
 assert mobile.locator('#guided-panel').bounding_box()['height']<600
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.screenshot(path=str(out/'mobile-guided.png'),full_page=True)
 mobile.evaluate('(value)=>localStorage.setItem("kumoh-me-guide-v1",value)',persisted)
 mobile.reload(wait_until='networkidle');mobile.locator('[data-start-advisor]').click();mobile.locator('[data-advisor=summary]').click()
 assert mobile.locator('#guided-panel').bounding_box()['height']<820
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.screenshot(path=str(out/'mobile-summary.png'),full_page=True)
 mobile.locator('#home-button').click()
 mobile.locator('#chat-input').fill('2024학번 인증과정이야. 졸업요건 알려줘');mobile.locator('#chat-input').press('Enter')
 assert mobile.locator('.answer-pager').last.is_visible()
 for _ in range(20):
  assert mobile.locator('.message.assistant').last.bounding_box()['height']<800
  next_button=mobile.locator('.message.assistant').last.locator('[data-page-step="1"]')
  if next_button.is_disabled():break
  next_button.click()
 assert not writes,writes
 assert not errors,errors
 print(json.dumps({'result':'passed','checks':['PDF upload/reconciliation','earned vs ongoing','consent/storage/delete','manual semester flow','home/resume','future-term planning','certification comparison','mobile/compact answers'],'network_writes':len(writes),'page_errors':errors},ensure_ascii=False))
 browser.close()
server.shutdown();tmp.cleanup()
