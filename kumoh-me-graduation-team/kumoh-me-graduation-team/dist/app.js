import {initAdvisor} from './advisor.js';
import {COURSES} from './academic.js';
import {compactPages,attachCompactPagination} from './compact-answer.js';
import { initPlanner } from './planner.js';
import { SOURCES, CHECK_ITEMS, answerQuestion, profileFromText, getRules, getCreditFields, validateCredits, calculateCredits, profileLabel, getProfileKey } from './knowledge.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = 'kumoh-me-guide-v1';
const emptyProfile = () => ({ year: '', admission: 'regular', certification: 'unknown' });
let state = { profile: emptyProfile(), records: {} };
try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
  if (saved && typeof saved === 'object' && saved.profile && typeof saved.records === 'object' && !Array.isArray(saved.records)) {
    state.profile = {
      year: Number.isInteger(Number(saved.profile.year)) && Number(saved.profile.year) >= 2000 && Number(saved.profile.year) <= 2026 ? Number(saved.profile.year) : '',
      admission: ['regular', 'transfer', 'changed', 'returnfirst'].includes(saved.profile.admission) ? saved.profile.admission : 'regular',
      certification: ['unknown', 'certified', 'noncertified'].includes(saved.profile.certification) ? saved.profile.certification : 'unknown',
    };
    state.records = saved.records;
  }
} catch { /* Storage is optional in restricted browsers. */ }
let planner;
let advisor;
let activeRecord=null;
let uploadPrompted=false;
let lastTopic = 'overview';
let pendingQuestion = '';
let toastTimer;
const transcript = [];
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const icon = id => `<svg aria-hidden="true"><use href="#i-${id}"/></svg>`;
function record() {
  const key = getProfileKey(state.profile);
  if(activeRecord?.key===key)return activeRecord.value;
  const existing = state.records[key];
  if (!existing || typeof existing !== 'object' || !existing.credits || !Array.isArray(existing.checks)) state.records[key] = { credits: {}, checks: [], calculated: false };
  return state.records[key];
}
function persist() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { toast('이 브라우저에서는 정보를 저장할 수 없어요. 현재 화면에서는 계속 사용할 수 있어요.'); }
}
function toast(message) {
  clearTimeout(toastTimer);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimer = setTimeout(() => { $('#toast').hidden = true; }, 4200);
}
for (let year = 2026; year >= 2000; year--) {
  const option = document.createElement('option');
  option.value = year;
  option.textContent = `${year}학년도 입학`;
  $('#entry-year').append(option);
}
function syncProfile() {
  $('#entry-year').value = state.profile.year;
  $('#admission-type').value = state.profile.admission;
  $('#certification').value = state.profile.certification;
  $('#profile-status').innerHTML = `<span class="tiny-dot"></span>${state.profile.year ? escape(profileLabel(state.profile)) + ' 기준 적용 중' : '정보를 선택하고 적용해 주세요.'}`;
}
function setProfile(profile) {
  state.profile = { ...state.profile, ...profile };
  if(activeRecord&&activeRecord.key!==getProfileKey(state.profile))activeRecord=null;
  syncProfile();
  renderProgress();
  planner?.invalidate();
  persist();
}
$('#profile-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!$('#entry-year').value) { $('#entry-year').focus(); toast('먼저 입학 연도를 선택해 주세요.'); return; }
  setProfile({ year: Number($('#entry-year').value), admission: $('#admission-type').value, certification: $('#certification').value });
  closePanels();
  toast('내 입학 연도와 인증과정을 적용했어요.');
  if (pendingQuestion) {
    const question = pendingQuestion;
    pendingQuestion = '';
    renderAnswer(question);
  } else if (transcript.length) {
    addBot({ sections: [{ title: '안내 기준을 변경했어요.', html: `<p>이후 답변은 <strong>${escape(profileLabel(state.profile))}</strong> 기준으로 안내해요. 이전 답변에는 당시 선택한 조건이 적용되어 있어요.</p>` }], sources: [], followups: ['내 졸업요건을 다시 정리해줘'] });
  }
});
function navigate() {
  const route = location.hash.slice(1);
  const view = ['chat', 'progress', 'planner', 'sources'].includes(route) ? route : 'chat';
  $$('.view').forEach(element => { element.hidden = element.id !== `view-${view}`; });
  $$('.nav-item').forEach(link => {
    const active = link.dataset.view === view;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  $('#page-title').textContent = { chat: '졸업요건 상담', progress: '나의 이수현황', planner: '수강 추천', sources: 'PDF 자료실' }[view];
  if (view === 'progress') renderProgress();
  if (view === 'planner') planner?.render({resetTerm:true});
  closePanels();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
window.addEventListener('hashchange', navigate);
function openProfile() {
  if (location.hash !== '#chat') { location.hash = 'chat'; }
  setTimeout(() => {
    if (window.innerWidth <= 1000) {
      $('#profile-panel').classList.add('open');
      $('#sidebar-backdrop').classList.add('show');
      $('#sidebar-backdrop').hidden = false;
    }
    $('#entry-year').focus({ preventScroll: window.innerWidth <= 1000 });
  }, 60);
}
function closePanels() {
  $('#sidebar').classList.remove('open');
  $('#profile-panel').classList.remove('open');
  $('#sidebar-backdrop').classList.remove('show');
  $('#sidebar-backdrop').hidden = true;
  $('#menu-toggle').setAttribute('aria-expanded', 'false');
}
$('#menu-toggle').addEventListener('click', () => {
  const open = !$('#sidebar').classList.contains('open');
  closePanels();
  $('#sidebar').classList.toggle('open', open);
  $('#sidebar-backdrop').classList.toggle('show', open);
  $('#sidebar-backdrop').hidden = !open;
  $('#menu-toggle').setAttribute('aria-expanded', String(open));
});
$('#mobile-profile').addEventListener('click', openProfile);
$('#profile-close').addEventListener('click', closePanels);
$('#sidebar-backdrop').addEventListener('click', closePanels);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closePanels(); });
window.addEventListener('resize', () => { if (window.innerWidth > 1000) closePanels(); });
function sourceLinks(ids) {
  return ids.filter(id => SOURCES[id]).map(id => `<a href="${escape(SOURCES[id].url)}" target="_blank" rel="noopener noreferrer">${icon('file')}${escape(SOURCES[id].shortTitle)}${icon('external')}</a>`).join('');
}
function addBot(answer) {
  advisor?.hide();
  const pages=compactPages(answer.sections);
  $('#view-chat').classList.add('chat-started');
  $('#messages').hidden = false;
  $('#resume-chat').hidden = true;
  const element = document.createElement('div');
  element.className = 'message assistant';
  element.innerHTML = `<div class="message-avatar">${icon('cap')}</div><div class="message-content"><span class="message-name">졸업 길잡이</span><div class="message-bubble">${pages[0]}</div><div class="answer-pager" hidden></div>${answer.sources?.length ? `<div class="answer-sources">${sourceLinks([...new Set(answer.sources)])}</div>` : ''}${answer.followups?.length ? `<div class="answer-chips">${answer.followups.map(label => `<button type="button" data-question="${escape(label)}">${escape(label)}</button>`).join('')}</div>` : ''}${answer.needsProfile ? '<div class="answer-chips"><button type="button" data-profile-open>내 정보 선택하기</button></div>' : ''}</div>`;
  attachCompactPagination(element,pages);
  if(!uploadPrompted&&!record().academic){
    const prompt=document.createElement('div');prompt.className='transcript-prompt';prompt.innerHTML='<p>성적표 PDF를 올려주실 수 있나요? 내 이수상태에 맞춰 안내해 드릴게요.</p><div><button type="button" data-upload-transcript>PDF 올리기</button><button type="button" data-manual-transcript>학기별로 입력하기</button></div>';element.querySelector('.message-content').append(prompt);uploadPrompted=true;
  }
  $('#messages').append(element);
  transcript.push({ role: 'assistant', text: element.innerText });
  element.scrollIntoView({ behavior: 'instant', block: 'nearest' });
}
function renderAnswer(question) {
  if(advisor?.handleQuestion(question))return;
  const answer = planner?.chatAnswer(question) || answerQuestion(question, state.profile, record().credits, lastTopic);
  if (answer.topic) lastTopic = answer.topic;
  if (answer.needsProfile) pendingQuestion = question;
  addBot(answer);
}
function sendMessage(question) {
  question = question.trim().slice(0, 1200);
  if (!question) return;
  if (location.hash !== '#chat') location.hash = 'chat';
  $('#view-chat').classList.add('chat-started');
  $('#messages').hidden = false;
  $('#resume-chat').hidden = true;
  const user = document.createElement('div');
  user.className = 'message user';
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = question;
  user.append(bubble);
  $('#messages').append(user);
  transcript.push({ role: 'user', text: question });
  const parsed = profileFromText(question, state.profile);
  if (parsed.changed) setProfile(parsed.profile);
  $('#chat-input').value = '';
  $('#chat-input').style.height = 'auto';
  renderAnswer(question);
}
document.addEventListener('click', event => {
  const questionButton = event.target.closest('[data-question]');
  if (questionButton) sendMessage(questionButton.dataset.question);
  if (event.target.closest('[data-profile-open]')) { event.preventDefault(); openProfile(); }
});
$('#chat-form').addEventListener('submit', event => { event.preventDefault(); sendMessage($('#chat-input').value); });
$('#chat-input').addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); sendMessage($('#chat-input').value); }
});
$('#chat-input').addEventListener('input', () => {
  $('#chat-input').style.height = 'auto';
  $('#chat-input').style.height = `${Math.min($('#chat-input').scrollHeight, 145)}px`;
});
function showHome() {
  const guidedHistory=advisor?.hasHistory;
  advisor?.hide();
  $('#view-chat').classList.remove('chat-started');
  $('#messages').hidden = true;
  $('#resume-chat').hidden = transcript.length === 0 && !guidedHistory;
  location.hash = 'chat';
  navigate();
}
$('#home-button').addEventListener('click', showHome);
$('.brand').addEventListener('click', event => { event.preventDefault(); showHome(); });
$('#resume-chat').addEventListener('click', () => {
  if(advisor?.hasHistory){advisor.resume();return;}
  $('#messages').hidden = false;
  $('#view-chat').classList.add('chat-started');
  $('#resume-chat').hidden = true;
  $('#messages').lastElementChild?.scrollIntoView({behavior:'instant',block:'nearest'});
});
$('#new-chat').addEventListener('click', () => {
  advisor?.hide();
  uploadPrompted=false;
  $('#messages').replaceChildren();
  $('#view-chat').classList.remove('chat-started');
  $('#messages').hidden = false;
  $('#resume-chat').hidden = true;
  transcript.length = 0;
  pendingQuestion = '';
  lastTopic = 'overview';
  $('#chat-input').value = '';
  location.hash = 'chat';
  navigate();
  $('#chat-input').focus({ preventScroll: true });
  toast('새 상담을 시작해요. 선택한 학적 정보는 유지돼요.');
});
function renderProgress() {
  const profile = state.profile;
  const rules = getRules(profile);
  const allowed = Boolean(rules && profile.admission === 'regular');
  $('#progress-context').innerHTML = `<span>${profile.year ? escape(profileLabel(profile)) + '<br>2026학년도 공개 기준표 · 개인별 개편 적용 여부 별도 확인' : '입학 연도와 인증과정을 먼저 선택해 주세요.'}${profile.year && profile.admission !== 'regular' ? '<br>학적 변동에 따른 개인별 적용 기준을 확인해야 하므로 자동 계산을 제공하지 않아요.' : ''}</span><a href="#chat" data-profile-open>내 정보 ${profile.year ? '변경' : '선택'}하기</a>`;
  $('#credits-form .primary-button').disabled = !allowed;
  const current = record();
  const fields = getCreditFields(profile);
  $('#credit-fields').innerHTML = fields.map(field => `<div class="credit-field"><label for="credit-${field.id}">${escape(field.label)}</label><div class="credit-input-wrap"><input id="credit-${field.id}" name="${field.id}" inputmode="decimal" type="number" min="0" max="300" step="0.5" placeholder="미입력" value="${current.credits[field.id] === undefined ? '' : escape(current.credits[field.id])}" ${allowed ? '' : 'disabled'}><span>학점</span></div><small>${field.required === null ? escape(field.unknown || '인증과정 확인 후 기준 표시') : `기준 ${field.required}학점`}${field.hint ? ' · ' + escape(field.hint) : ''}</small></div>`).join('');
  $('#credits-hint').textContent = !allowed ? '학적 정보를 선택한 뒤 일반 신입학 기준을 확인할 수 있어요.' : '전공필수·전공선택을 각각 입력하면 전공 합계를 계산해요. 교양은 MSC를 빼고 입력하세요. 비워 둔 항목은 미확인이며, 이수한 학점이 없으면 0을 입력하세요. 2025 이후 필수32·추가선택39는 일반 신입학의 전공 선택 경로 기준입니다.';
  if (current.credits.major !== undefined && current.credits.majorRequired === undefined && current.credits.majorElective === undefined) $('#credits-hint').textContent += ` 이전에 저장한 전공 합계 ${current.credits.major}학점은 남겨 두었어요. 필수·선택으로 나누어 다시 입력해 주세요.`;
  $('#manual-checks').innerHTML = CHECK_ITEMS.map(item => `<label class="manual-check"><input type="checkbox" data-check="${item.id}" ${current.checks.includes(item.id) ? 'checked' : ''}><span>${escape(item.title)}<small>${escape(item.description)}</small></span></label>`).join('');
  $('#credit-error').hidden = true;
  if (current.calculated && allowed) renderCreditResult(); else $('#credit-result').replaceChildren();
}
$('#manual-checks').addEventListener('change', event => {
  const id = event.target.dataset.check;
  if (!id) return;
  const current = record();
  current.checks = current.checks.filter(value => value !== id);
  if (event.target.checked) current.checks.push(id);
  persist();
});
$('#credits-form').addEventListener('submit', event => {
  event.preventDefault();
  const credits = {};
  for (const [key, value] of new FormData(event.target)) if (value !== '') credits[key] = Number(value);
  const error = validateCredits(state.profile, credits);
  if (error) {
    $('#credit-error').textContent = error;
    $('#credit-error').hidden = false;
    return;
  }
  $('#credit-error').hidden = true;
  record().credits = credits;
  record().calculated = true;
  persist();
  renderCreditResult();
  $('#credit-result').scrollIntoView({ behavior: 'instant', block: 'nearest' });
});
function renderCreditResult() {
  const result = calculateCredits(state.profile, record().credits);
  if (!result.ok) { $('#credit-result').innerHTML = `<div class="answer-note">${escape(result.error)}</div>`; return; }
  $('#credit-result').innerHTML = `<div class="credit-results"><h2>남은 학점, 이렇게 확인하세요.</h2><p class="result-caption">${escape(profileLabel(state.profile))} · 입력한 취득학점 기준</p>${result.rows.map(row => `<div class="result-row"><div class="result-row-heading"><span>${escape(row.label)}</span><strong>${row.value === null ? '미입력' : row.value}${row.required === null ? ' / 기준 확인 필요' : ` / ${row.required}학점`}</strong></div><div class="progress-track" role="img" aria-label="${escape(row.label)} ${row.value ?? '미입력'} / ${row.required ?? '기준 미확인'}학점"><div class="progress-fill" style="width:${row.percent}%"></div></div><small class="${row.remaining > 0 ? 'remaining' : ''}">${row.remaining === null ? '추가 정보가 필요해요.' : row.remaining > 0 ? `${row.remaining}학점 더 필요해요.` : '입력값 기준으로 이 항목의 학점 수를 충족해요.'}</small></div>`).join('')}<div class="result-footer">총학점과 각 이수영역의 요건은 각각 충족해야 합니다. 필수과목·영역별 교양·설계학점·논문·학습성과 등은 이 계산에 포함되지 않아요. 최종 졸업 가능 여부는 별도 확인이 필요합니다.</div><div class="answer-sources">${sourceLinks(['workbookGraduation', 'curriculum2026'])}</div></div>`;
}
function renderSources() {
  $('#sources-list').innerHTML = Object.values(SOURCES).filter(source => source.downloadable).map(source => `<article class="source-card"><div class="source-card-icon">${icon('file')}</div><div class="source-card-content"><h2><span class="source-label">PDF</span>${escape(source.title)}</h2><p>${escape(source.description)}</p><div class="source-meta">${escape(source.meta)}</div></div><div class="source-actions"><a class="source-card-link" href="${escape(source.url)}" target="_blank" rel="noopener noreferrer">열어보기${icon('external')}</a><a class="pdf-download" href="${escape(source.url)}" download>${icon('download')}PDF 내려받기</a></div></article>`).join('');
  $('#official-sources').innerHTML = Object.values(SOURCES).filter(source => !source.downloadable && ![SOURCES.office,SOURCES.notices,SOURCES.curriculum2025].includes(source)).map(source => `<a href="${escape(source.url)}" target="_blank" rel="noopener noreferrer"><span>${escape(source.title)}<small>${escape(source.meta)}</small></span>${icon('external')}</a>`).join('');
  $('#office-link').href = SOURCES.office.url;
}
$('#download-report').addEventListener('click', () => {
  const current = record();
  const result = calculateCredits(state.profile, current.credits);
  const lines = ['금오공과대학교 기계공학전공 졸업요건 점검', '비공식 참고용 · 공식 졸업판정 아님', `작성: ${new Date().toLocaleString('ko-KR')}`, `적용 조건: ${profileLabel(state.profile)}`, '자료 확인일: 2026-10-30', '', '저장된 이수학점 (화면에서 계산을 완료한 입력값)'];
  if (result.ok && current.calculated) for (const row of result.rows) lines.push(`${row.label}: ${row.value ?? '미입력'} / ${row.required ?? '기준 미확인'}학점 · ${row.remaining === null ? '확인 필요' : row.remaining + '학점 부족'}`);
  else lines.push('저장된 학점 계산 결과가 없습니다.');
  lines.push('', '학생이 직접 기록한 확인 항목 (공식 검증 아님)');
  for (const item of CHECK_ITEMS) lines.push(`${current.checks.includes(item.id) ? '[확인 표시]' : '[미확인]'} ${item.title}`);
  lines.push('', '유의사항: 총학점 충족만으로 졸업이 확정되지 않습니다. 필수과목, 교양 세부영역, 설계학점, 논문·학습성과 등과 학적 변동에 따른 개인별 적용 기준은 전공 사무실에서 확인하세요.', '', '공식 근거');
  for (const source of Object.values(SOURCES).filter(source => source.show !== false)) lines.push(`${source.title}\n${new URL(source.url, location.href).href}`);
  const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `금오공대_졸업점검_${state.profile.year || '미선택'}_${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('저장된 점검 내용과 공식 출처를 내려받았어요.');
});
$('#about-open').addEventListener('click', () => $('#about-dialog').showModal());
$('#about-close').addEventListener('click', () => $('#about-dialog').close());
$('#about-dialog').addEventListener('click', event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) event.currentTarget.close(); } });
$('#reset-local').addEventListener('click', () => {
  advisor?.clear();
  activeRecord=null;
  uploadPrompted=false;
  state = { profile: emptyProfile(), records: {} };
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* Optional storage. */ }
  $('#messages').replaceChildren();
  $('#view-chat').classList.remove('chat-started');
  $('#messages').hidden = false;
  $('#resume-chat').hidden = true;
  $('#chat-input').value = '';
  transcript.length = 0;
  pendingQuestion = '';
  lastTopic = 'overview';
  syncProfile();
  renderProgress();
  planner?.invalidate();
  $('#reset-status').textContent = '학적 정보, 이수현황, 체크리스트와 현재 대화를 삭제했어요.';
});
function applyAcademic(academic,result){
  const key=getProfileKey(state.profile);
  if(!academic){
    activeRecord=null;
    for(const [k,r] of Object.entries(state.records))if(r.academic)delete state.records[k];
    persist();renderProgress();planner?.invalidate();return;
  }
  const value={...record(),credits:{total:result.totals.total,majorRequired:result.totals.majorRequired,majorElective:result.totals.majorElective,liberal:result.totals.liberal,msc:result.totals.msc},completedCourses:result.done.filter(code=>code.startsWith('CA')),completionConfirmed:true,calculated:true,academic:structuredClone(academic)};
  activeRecord={key,value};
  if(academic.saveLocal)state.records[key]=structuredClone(value);
  else if(state.records[key]?.academic)delete state.records[key];
  persist();renderProgress();planner?.invalidate();
}
$('#academic-course-options').innerHTML=COURSES.map(c=>`<option value="${escape(c.name)} (${c.code})"></option>`).join('');
advisor=initAdvisor({getProfile:()=>state.profile,setProfile,getSaved:record,applyAcademic,escape,toast,activate(){location.hash='chat';$('#view-chat').classList.add('chat-started');$('#messages').hidden=true;$('#resume-chat').hidden=true;}});
planner = initPlanner({getProfile:()=>state.profile,getRecord:record,persist,toast,escape,icon});
syncProfile();
renderSources();
renderProgress();
navigate();
