import os
import shutil
import json
import threading
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

out = Path(__file__).resolve().parents[1]/'artifacts'
out.mkdir(exist_ok=True)
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*args): pass
server=ThreadingHTTPServer(('127.0.0.1',4174),partial(QuietHandler,directory=str(out.parent/'dist')))
threading.Thread(target=server.serve_forever,daemon=True).start()
with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.environ.get('KIT_CHROMIUM_EXECUTABLE') or shutil.which('chromium'), headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={'width':1440,'height':1000}, device_scale_factor=1)
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    response = page.goto('http://127.0.0.1:4174', wait_until='networkidle')
    assert response.status == 200
    page.screenshot(path=str(out/'desktop.png'), full_page=True)
    page.get_by_role('button', name='졸업요건 한눈에 보기').click()
    assert '먼저 입학 연도' in page.locator('#messages').inner_text()
    page.locator('#entry-year').select_option('2022')
    page.locator('#certification').select_option('noncertified')
    page.locator('#profile-form').get_by_role('button', name='내 기준 적용하기').click()
    assert '71학점' in page.locator('#messages').inner_text()
    page.locator('#chat-input').fill('그럼 교양과 MSC는?')
    page.locator('#chat-input').press('Enter')
    assert '비인증 40학점' in page.locator('#messages').inner_text()
    # Returning home retains the conversation and restores starter buttons.
    old_messages=page.locator('#messages .message').count()
    page.locator('#home-button').click()
    assert page.locator('#welcome').is_visible()
    assert not page.locator('#messages').is_visible()
    page.locator('#resume-chat').click()
    assert page.locator('#messages .message').count()==old_messages
    assert page.locator('#messages').is_visible()
    page.get_by_role('link',name='수강 추천',exact=True).click()
    assert page.locator('#plan-year').input_value()==''
    assert page.locator('#plan-semester').input_value()==''
    page.get_by_role('button',name='내 수강 후보 추천받기').click()
    assert '연도와 학기' in page.locator('#plan-error').inner_text()
    page.locator('#plan-year').select_option('2027')
    page.locator('#plan-semester').select_option('1')
    page.locator('#plan-grade').select_option('3')
    page.locator('[data-course="CA1005"]').check()
    page.locator('[data-course-filter="elective"]').click()
    page.locator('[data-course="CA0003"]').check()
    page.locator('#completed-confirmed').check()
    page.get_by_role('button',name='내 수강 후보 추천받기').click()
    assert '2027학년도 1학기 수강 후보' in page.locator('#plan-result').inner_text()
    assert '미이수 전공필수' in page.locator('#plan-result').inner_text()
    assert '전공선택' in page.locator('#plan-result').inner_text()
    assert not page.locator('.plan-course h3').filter(has_text='정역학').count()
    with page.expect_download() as plan_item: page.locator('#plan-download').click()
    plan_item.value.save_as(out/'plan.txt')
    assert '실제 개설' in (out/'plan.txt').read_text('utf-8-sig')
    page.screenshot(path=str(out/'planner.png'),full_page=True)
    page.locator('#plan-semester').select_option('2')
    assert page.locator('#plan-result').inner_text()==''
    page.get_by_role('link',name='졸업요건 상담',exact=True).click()
    page.locator('#chat-input').fill('부전공과 AI로봇 기준 알려줘')
    page.locator('#chat-input').press('Enter')
    assert page.locator('#admission-type').input_value()=='regular'
    assert '30학점' in page.locator('#messages').inner_text()
    page.get_by_role('link',name='수강 추천',exact=True).click()
    assert page.locator('#plan-year').input_value()==''
    assert page.locator('#plan-semester').input_value()==''
    assert page.locator('[data-course="CA0003"]').is_checked()
    page.get_by_role('link', name='나의 이수현황').click()
    for key,value in {'total':'110','majorRequired':'29','majorElective':'31','liberal':'20','msc':'20'}.items():
        page.locator('#credit-'+key).fill(value)
    page.get_by_role('button', name='남은 학점 확인하기').click()
    assert '11학점 더 필요해요.' in page.locator('#credit-result').inner_text()
    assert '20학점 더 필요해요.' in page.locator('#credit-result').inner_text()
    page.screenshot(path=str(out/'progress.png'), full_page=True)
    page.locator('#credit-total').fill('90')
    page.get_by_role('button', name='남은 학점 확인하기').click()
    assert page.locator('#credit-error').is_visible()
    page.reload(wait_until='networkidle')
    assert page.locator('#credit-total').input_value() == '110'
    page.locator('[data-check="required"]').check()
    with page.expect_download() as item:
        page.get_by_role('button', name='점검 내용 저장').click()
    item.value.save_as(out/'report.txt')
    assert '공식 졸업판정 아님' in (out/'report.txt').read_text('utf-8-sig')
    page.get_by_role('link', name='PDF 자료실').click()
    assert page.locator('.source-card').count() == 3
    for link in page.locator('.pdf-download').all():
        with page.expect_download() as pdf_item: link.click()
        pdf_path=out/pdf_item.value.suggested_filename
        pdf_item.value.save_as(pdf_path)
        assert pdf_path.read_bytes().startswith(b'%PDF-')
    page.screenshot(path=str(out/'sources.png'), full_page=True)
    page.get_by_role('button', name='새 상담 시작').click()
    page.locator('#chat-input').fill('<img src=x onerror=alert(1)>')
    page.locator('#chat-input').press('Enter')
    assert page.locator('#messages img').count() == 0
    page.get_by_role('button', name='새 상담 시작').click()
    page.locator('#chat-input').fill('2023학번 편입생인데 졸업요건 알려줘')
    page.locator('#chat-input').press('Enter')
    assert '일반 신입학 숫자로 자동 판정하지' in page.locator('#messages').inner_text()
    page.get_by_role('link', name='나의 이수현황').click()
    assert page.get_by_role('button', name='남은 학점 확인하기').is_disabled()
    page.get_by_role('button', name='서비스 안내', exact=True).click()
    page.get_by_role('button', name='이 브라우저의 입력 정보 삭제').click()
    page.get_by_role('button', name='안내 닫기').click()
    page.reload(wait_until='networkidle')
    assert page.evaluate('localStorage.getItem("kumoh-me-guide-v1")') is None
    mobile = browser.new_page(viewport={'width':390,'height':844}, device_scale_factor=1, is_mobile=True, has_touch=True)
    mobile.on('pageerror',lambda error: errors.append(str(error)))
    mobile.goto('http://127.0.0.1:4174',wait_until='networkidle')
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    mobile.screenshot(path=str(out/'mobile.png'),full_page=True)
    mobile.get_by_role('button',name='내 정보',exact=True).click()
    mobile.locator('#profile-panel').wait_for(state='visible')
    mobile.locator('#entry-year').select_option('2025')
    mobile.locator('#certification').select_option('certified')
    mobile.get_by_role('button',name='내 기준 적용하기').click()
    assert not mobile.locator('#profile-panel').is_visible()
    mobile.get_by_role('button',name='메뉴 열기').click()
    mobile.get_by_role('link',name='나의 이수현황').click()
    assert mobile.locator('#view-progress').is_visible()
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    mobile.get_by_role('button',name='처음 화면',exact=True).click()
    assert mobile.locator('#welcome').is_visible()
    mobile.locator('.planner-entry').click()
    mobile.locator('#plan-year').select_option('2028')
    mobile.locator('#plan-semester').select_option('2')
    mobile.locator('#plan-grade').select_option('3')
    mobile.locator('#completed-confirmed').check()
    mobile.get_by_role('button',name='내 수강 후보 추천받기').click()
    assert '수강 후보' in mobile.locator('#plan-result').inner_text()
    assert mobile.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
    mobile.screenshot(path=str(out/'mobile-planner.png'),full_page=True)
    assert not errors, errors
    print(json.dumps({'result':'passed','console_errors':errors,'screenshots':['desktop.png','progress.png','mobile.png']},ensure_ascii=False))
    browser.close()
