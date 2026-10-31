import {COURSES,CATEGORIES,GRADES,findCourse,courseCategory,suggestedCourses,sanitizeRow,auditRows,assessAcademic,recommendAcademic} from './academic.js';
import {readTranscript} from './transcript.js';
const blankAcademic=()=>({rows:[],reviewed:false,declaredTotal:null,gpa:null,lastRegularGpa:null,currentCourses:[],currentCourseCredits:{},currentConfirmed:false,goals:[],goalStatuses:{},goalStatus:'interested',recognizedEquivalents:[],semesterNo:0,coverage:[],saveLocal:false});
const termLabel=n=>`${Math.ceil(n/2)}학년 ${n%2?1:2}학기`;
const CURRENT_YEAR=new Date().getFullYear();
export function initAdvisor({getProfile,setProfile,getSaved,applyAcademic,activate,escape:esc,toast}){
 const panel=document.querySelector('#guided-panel'),fileInput=document.querySelector('#transcript-file'),dialog=document.querySelector('#transcript-review');
 let academic=null,step='source',visible=false,history=false,controller=null,reading=false,manualIndex=1,pickerMode='manual',pickerSearch='',pickerGroup='all',reviewPage=0,reviewAfter='current',lastPlan=null,detailPage=0;
 const button=(label,action,cls='choice-button')=>`<button type="button" class="${cls}" data-advisor="${action}">${label}</button>`;
 const select=(id,label,options,value='',extra='')=>`<label class="guided-field" for="${id}"><span>${label}</span><select id="${id}" ${extra}>${options.map(([v,t])=>`<option value="${v}" ${String(value)===String(v)?'selected':''}>${t}</option>`).join('')}</select></label>`;
 const a=()=>{if(!academic)academic=structuredClone(getSaved()?.academic||blankAcademic());return academic;};
 function frame(title,body,{eyebrow='맞춤 졸업 상담',back='source'}={}){
  activate();visible=true;history=true;panel.hidden=false;
  panel.innerHTML=`<div class="guided-top"><span>${eyebrow}</span><button type="button" data-advisor="close" aria-label="맞춤 상담 닫기">×</button></div><div class="guided-heading"><span class="guided-avatar">kit</span><h2>${title}</h2></div><div class="guided-body">${body}</div><div class="guided-bottom">${back?button('← 이전',back,'guided-back'):''}<span>입력한 정보를 바탕으로 안내해요</span></div>`;
  panel.scrollIntoView({behavior:'instant',block:'start'});
  const heading=panel.querySelector('h2');heading.tabIndex=-1;heading.focus({preventScroll:true});
 }
 function source(){step='source';frame('성적표 PDF를 올려주실 수 있나요?',`<p>이수한 과목을 읽고, 졸업까지 남은 항목을 짧게 정리해 드릴게요.</p><div class="source-choices">${button('<strong>PDF로 분석하기</strong><small>글자·이미지 성적표 지원</small>','upload','choice-button featured')}${button('<strong>학기별로 직접 입력</strong><small>1학년 1학기부터 차근차근</small>','manual')}</div>${a().reviewed?button('이전 분석 이어보기','summary','guided-link'):''}<p class="guided-footnote">PDF는 이 기기에서만 읽습니다. 원본은 전송·저장하지 않아요. 이미지 PDF는 금오공대 3열 성적증명서 양식 기준입니다.</p>`,{back:''});}
 function profile(){
  step='profile';const p=getProfile();const draft=a();
  frame('지금 학적을 알려주세요.',`<form id="advisor-profile" class="guided-form"><div class="guided-fields">${select('guide-entry','입학 연도',[['','선택'],...Array.from({length:27},(_,i)=>[2026-i,`${2026-i}학년도`])],p.year||draft.entryYear||'')}${select('guide-admission','입학·학적',[['regular','일반 신입학'],['transfer','편입학'],['changed','전과·재입학 등']],p.admission)}${select('guide-grade','현재 학년',[['','선택'],[1,'1학년'],[2,'2학년'],[3,'3학년'],[4,'4학년']],draft.grade||'')}${select('guide-semester','현재 학기',[['','선택'],[1,'1학기'],[2,'2학기']],draft.currentSemester||'')}${select('guide-current-year','현재 학년도',Array.from({length:5},(_,i)=>[2026+i,`${2026+i}학년도`]),draft.currentYear||CURRENT_YEAR)}${select('guide-certification','공학교육인증',[['unknown','아직 모르겠어요'],['certified','인증과정'],['noncertified','비인증과정']],p.certification)}</div><label class="guided-field" for="guide-semester-no"><span>이번 학기는 몇 번째 등록학기인가요? <small>휴학기간 제외</small></span><select id="guide-semester-no"><option value="">학년·학기 선택 후 확인</option>${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${draft.semesterNo===i+1?'selected':''}>${i+1}번째 학기</option>`).join('')}</select></label><p id="guided-error" class="error-message" role="alert" hidden></p><button type="submit" class="primary-button">이 정보로 계속하기 →</button></form>`,{eyebrow:'01 · 학적 확인'});
 }
 function startManual(){academic=blankAcademic();academic.mode='manual';manualIndex=1;profile();}
 function picker(mode){
  pickerMode=mode;step=mode;pickerSearch='';pickerGroup='all';
  const n=mode==='manual'?manualIndex:a().semesterNo;
  const title=mode==='manual'?`${termLabel(n)}, 무엇을 이수했나요?`:'이번 학기에 듣는 과목은 무엇인가요?';
  frame(title,`<p>${mode==='manual'?'취득 완료한 과목만 선택해 주세요. 실제 학점·성적은 확인 화면에서 수정할 수 있어요.':'아직 취득하지 않은 수강 중 과목을 표시해 주세요. 취득학점에는 더하지 않습니다.'}</p><div class="picker-toolbar"><input id="guided-search" type="search" aria-label="과목 검색" placeholder="과목명 · 코드 검색"><select id="guided-group" aria-label="과목 구분"><option value="all">전체 구분</option><option value="major">전공필수·선택</option><option value="foundation">교양·MSC</option><option value="program">SSU·AI로봇</option></select></div><div id="guided-course-list" class="guided-course-list"></div><div id="guided-selection-count" class="guided-selection-count"></div>${mode==='manual'?`${button('목록에 없는 과목 추가','add-manual','guided-link')}<div class="guided-actions">${button(manualIndex<Math.max(1,a().semesterNo-1)?'이 학기 확인 · 다음 학기 →':'이수내역 확인하기 →','manual-next','primary-button')}${button('이 학기 이수 없음','manual-empty','secondary-button')}</div>${manualIndex>1?button('이전 학기 수정','manual-prev','guided-link'):''}`:`<div class="guided-actions">${button('현재 수강과목 확인했어요','current-confirm','primary-button')}${button('현재 수강 없음','current-empty','secondary-button')}</div>${button('나중에 입력할게요','goals','guided-link')}`}<p id="guided-error" class="error-message" role="alert" hidden></p>`,{eyebrow:mode==='manual'?`02 · 학기별 입력 ${manualIndex}/${Math.max(1,a().semesterNo-1)}`:'03 · 수강 중 과목',back:mode==='manual'?'profile':'review'});
  renderPicker();
 }
 function renderPicker(){
  const n=pickerMode==='manual'?manualIndex:a().semesterNo,grade=pickerMode==='manual'?Math.ceil(n/2):Number(a().grade),semester=pickerMode==='manual'?(n%2?1:2):Number(a().currentSemester);
  const picked=pickerMode==='manual'?a().rows.filter(r=>r.term===termLabel(n)).map(r=>r.code):a().currentCourses;
  const query=pickerSearch.toUpperCase().replace(/\s/g,'');
  const list=COURSES.filter(c=>{
   if(query)return (c.name+c.code).toUpperCase().replace(/\s/g,'').includes(query);
   if(pickerGroup==='program')return Boolean(c.program);
   if(c.program)return false;
   return c.semesters.includes(semester)&&(!c.year||(pickerMode==='manual'?c.year===grade:c.year<=grade));
  }).filter(c=>pickerGroup==='major'?/전공필수|전공선택/.test(c.category):pickerGroup==='foundation'?c.category&&!/전공/.test(c.category):true);
  document.querySelector('#guided-course-list').innerHTML=list.slice(0,60).map(c=>`<div class="guided-course"><label><input type="checkbox" data-guided-course="${c.code}" ${picked.includes(c.code)?'checked':''}><span><strong>${esc(c.name)}</strong><small>${esc(c.category||c.program+' 융합')} · ${c.credits===null?'학점 미기재':c.credits+'학점'}</small></span></label>${pickerMode==='current'&&picked.includes(c.code)&&c.credits===null?`<label class="current-credit"><span>신청학점</span><input data-current-credit="${c.code}" type="number" min="0" max="9" step="0.5" value="${a().currentCourseCredits[c.code]??''}" aria-label="${esc(c.name)} 수강학점"></label>`:''}</div>`).join('')||'<p class="empty-state">검색 결과가 없어요. 과목코드나 다른 검색어를 입력해 주세요.</p>';
  document.querySelector('#guided-selection-count').textContent=`선택 ${picked.filter(Boolean).length}과목${pickerMode==='current'?' · 이수 완료로 처리하지 않아요':''}`;
 }
 function goals(){step='goals';frame('어떤 과정을 준비하고 있나요?',`<p>진행 중이거나 관심 있는 과정을 골라 주세요. 여러 개를 선택해도 돼요.</p><div class="goal-options">${[['ssu','SSU 반도체 융합전공','반도체·기계공학 연결'],['robot','AI로봇 융합전공','로봇·제어·PBL'],['analysis','마이크로디그리','전산설계 및 해석마스터']].map(([id,title,sub])=>`<label class="goal-option"><input type="checkbox" data-goal="${id}" ${a().goals.includes(id)?'checked':''}><span><strong>${title}</strong><small>${sub}</small></span></label>`).join('')}</div>${a().goals.map(goal=>select('guide-goal-'+goal,({ssu:'SSU 반도체',robot:'AI로봇',analysis:'마이크로디그리'})[goal]+' · 현재 상태',[['interested','관심 있어요 · 준비 중'],['inprogress','선발·등록되어 이수 중'],['undecided','아직 정하지 않았어요']],a().goalStatuses?.[goal]||(a().program===goal?'inprogress':'interested'),`data-goal-status="${goal}"`)).join('')}<p class="guided-footnote">SSU 특성화사업 참여와 융합전공 등록은 다를 수 있어요. 졸업학점 분석에는 성적표의 이수구분을 사용합니다.</p>${button('내 이수상태 보기 →','goals-confirm','primary-button')}`,{eyebrow:'04 · 관심 과정',back:'current'});}
 function assessment(){return assessAcademic(getProfile(),a());}
 function apply(){const s=assessment();if(a().reviewed&&s.ok)applyAcademic(a(),s);return s;}
 function summary(){
  step='summary';const s=apply();
  if(!a().reviewed){source();return;}
  if(!s.eligible){frame('적용 기준부터 확인해요.',`<p>${s.errors.length?esc(s.errors[0]):'편입·전과 등은 개인별 인정내역 확인이 필요합니다. 성적표 집계는 보존하고 일반 신입학 기준으로 충족 판정을 하지 않아요.'}</p>${button('이수내역 다시 확인','review','primary-button')}${button('학적 정보 수정','profile','guided-link')}`);return;}
  const metrics=[['총학점',s.totals.total,s.rules.total],['전공 합계',s.totals.major,s.rules.major],['교양 · MSC 제외',s.totals.liberal,s.rules.liberal],['MSC',s.totals.msc,s.rules.msc]];
  const risk=s.capacityRisk?`학기당 18학점을 계획하면 8학기까지 남은 수강 여유보다 ${s.deficits.total-s.capacity}학점 더 필요해요.`:s.lowGpa?`확인한 최근 정규학기 평점은 ${a().lastRegularGpa}예요. 수강 부담과 학교의 수강상한 적용 여부를 함께 점검해요.`:`총 ${s.deficits.total}학점이 더 필요해요. ${a().currentConfirmed?`현재 수강 ${s.currentCredits}학점은 통과 후에 반영됩니다.`:'이번 학기 수강내역도 확인하면 계획을 더 정확히 세울 수 있어요.'}`;
  frame('지금은 이 네 가지만 보세요.',`<div class="academic-metrics">${metrics.map(([label,value,target])=>`<div><span>${label}</span><strong>${value}<small> / ${target??'?'}학점</small></strong>${label==='전공 합계'?`<small>전필 ${s.totals.majorRequired} · 전선 ${s.totals.majorElective}</small>`:''}</div>`).join('')}</div><p class="required-overview">현행 전공필수 ${13-s.remaining.length}/13과목 확인 · 수강 중 ${s.inProgress.length} · 남은 ${s.missing.length}</p><div class="academic-insight ${s.capacityRisk||s.lowGpa?'attention':''}">${esc(risk)}</div><div class="summary-actions">${button('다음 학기 추천','plan','primary-button')}${button('필수과목 확인','required')}${button('교양·MSC 확인','foundation')}${button('선택과정 확인','programs')}${button('인증 유지·비인증 비교','compare')}</div><p class="guided-footnote">수치 충족은 학점 기준의 참고 결과입니다. 구학번 필수·대체 인정, 비교과·논문·상담은 별도 확인해요.</p><div class="guided-utilities">${button('이수내역 수정','review','guided-link')}${button('입력 정보 수정','profile','guided-link')}${button('요약 저장','download','guided-link')}${button('성적표 기록 삭제','delete-academic','guided-link')}</div>`,{eyebrow:'05 · 내 이수상태',back:'goals'});
 }
 function required(){
  step='required';const s=assessment();const list=s.remaining.slice(detailPage*5,detailPage*5+5);
  frame('남은 필수과목부터 확인해요.',`<p>현행 13과목 중 ${13-s.remaining.length}과목을 이수목록과 연결했어요. 과거 학번의 필수 지정·대체 인정은 따로 확인하세요.</p><div class="brief-course-list">${list.map(c=>`<div><span><strong>${esc(c.name)}</strong><small>${c.year}학년 ${c.semesters.join('·')}학기 · ${c.credits}학점</small></span><em>${s.inProgress.some(x=>x.code===c.code)?'수강 중':'남은 과목'}</em></div>`).join('')||'<p>현행 목록의 필수과목이 모두 연결되었어요.</p>'}</div>${s.remaining.length>5?`<div class="answer-pager">${button('이전','required-prev','guided-link')}<span>${detailPage+1}/${Math.ceil(s.remaining.length/5)}</span>${button('다음','required-next','guided-link')}</div>`:''}<p class="guided-footnote">기계공학과제1·2는 이수 순서와 지도교수 배정을 함께 확인하세요.</p><div class="guided-actions">${button('이번 학기 수강과목 수정','current','primary-button')}${button('분석 요약','summary','secondary-button')}</div>`,{back:'summary'});
 }
 function foundation(){
  step='foundation';const s=assessment();frame('교양과 MSC를 분리해서 봐요.',`<div class="detail-stat"><span>기초교양</span><strong>${s.totals.liberalCommon} / ${s.rules.liberalCommon}학점</strong></div><div class="detail-stat"><span>선택교양</span><strong>${s.totals.liberalElective} / ${s.rules.liberalElective}학점</strong></div><div class="detail-stat"><span>MSC</span><strong>${s.totals.msc} / ${s.rules.msc??'인증 여부 확인'}학점</strong></div><p>${s.rules.newer?'2025 이후는 균형교양 3개 영역 각 1과목과 사회봉사1도 확인해야 해요.':'이전 학번은 교양 합계 20학점 기준이며, 균형교양 영역별 필수 조건을 일괄 적용하지 않아요.'}</p><p class="guided-footnote">성적표에서 교양으로 표시된 공학수학·프로그래밍·확률통계 등도 MSC 과목으로 구분해 중복 합산하지 않았어요. 과목별 지정필수·영역과 대체 인정은 PDF로 대조하세요.</p><div class="guided-actions">${button('취업진로교육·상담','beyond','primary-button')}${button('분석 요약','summary','secondary-button')}</div>`,{back:'summary'});
 }
 function beyond(){step='beyond';frame('학점 밖에서도 세 가지를 챙겨요.',`<div class="brief-course-list"><div><span><strong>취업진로교육</strong><small>기본 8개 과정 · 편입·학적별 예외 확인</small></span><em>별도 확인</em></div><div><span><strong>지도교수 상담</strong><small>성적표에서 ${assessment().counselingCount}회 이수 표시 확인</small></span><em>기준 대조</em></div><div><span><strong>논문·졸업설계·학습성과</strong><small>졸업학기의 제출 일정과 통과 여부</small></span><em>별도 확인</em></div></div><p>성적표만으로 비교과 이수와 제출 완료를 판단하지 않아요.</p><a class="primary-button" href="docs/kit-graduation-guide.pdf" target="_blank" rel="noopener">졸업·비교과 PDF 보기</a>`,{back:'summary'});}
 function programs(){
  step='programs';const s=assessment(),goal=a().goals[detailPage]||'ssu',v=s.programs[goal],label={ssu:'SSU 반도체 융합전공',robot:'AI로봇 융합전공',analysis:'전산설계 및 해석마스터'}[goal];
  const equivalents=a().rows.filter(r=>r.included&&findCourse(r.code||r.name)?.sameAs?.length);
  frame(label,`<div class="detail-stat"><span>${goal==='analysis'?'구성과목 취득':'직접 이수한 과정 과목'}</span><strong>${v.direct} / ${v.required}학점</strong></div><p>${goal==='analysis'?`12학점 과정의 구성 후보 5과목 중 취득 내역을 집계했어요. 조합·신청·인정 절차도 확인하세요.`:`추가 동일인정 후보 ${v.potential.length}과목이 있어요. 승인 전에는 완료학점에 더하지 않아요. 동일인정 한도 ${v.cap}학점${goal==='ssu'?' 중 2학년 과목은 최대 9학점':''}도 적용됩니다.`}</p><p>${goal==='ssu'?'SSU는 트랙 이수요건도 필요합니다.':goal==='robot'?'AI로봇은 PBL 융합프로젝트 이수도 필요합니다.':'과목을 모두 들어야 하는 뜻은 아닙니다.'}</p>${equivalents.length?`<details class="recognition-details"><summary>주전공 동일인정 승인 확인 (${equivalents.length}과목)</summary>${equivalents.map(r=>{const c=findCourse(r.code||r.name);return `<label class="recognition-row"><input type="checkbox" data-recognition="${c.code}" ${a().recognizedEquivalents.includes(c.code)?'checked':''}><span>${esc(c.name)} → ${c.sameAs.map(code=>esc(findCourse(code)?.name||code)).join(', ')}<small>주전공 대체 인정이 승인된 경우만 체크</small></span></label>`;}).join('')}</details>`:''}<p class="guided-footnote">이미 성적표에 전공학점으로 분류된 학점은 주전공 합계에 한 번만 반영합니다. 등록 상태·동일인정·트랙까지 확인해야 과정 완료를 판단할 수 있어요.</p><div class="guided-actions">${button('이 과정에 맞춰 추천','plan','primary-button')}${button('관심 과정 변경','goals','secondary-button')}</div>${a().goals.length>1?button('다른 선택과정 보기','program-next','guided-link'):''}`,{back:'summary'});
 }
 function compare(){
  step='compare';const s=assessment();if(!s.rules){profile();return;}
  const reduction=s.mscCompare.certified-s.mscCompare.noncertified;
  frame('인증을 유지할 때와 비교해 볼게요.',`<div class="path-comparison"><div><span>인증 유지</span><strong>MSC ${s.rules.mscCertified}학점</strong><small>현재 ${s.mscCompare.certified}학점 부족</small><small>설계·상담·학습성과 기준 추가 확인</small></div><div><span>비인증 가정</span><strong>MSC ${s.rules.mscNoncertified}학점</strong><small>현재 ${s.mscCompare.noncertified}학점 부족</small><small>전환 가능 여부·시기·승인 확인 필요</small></div></div><p>${reduction>0?`MSC 부족분은 최대 ${reduction}학점 줄어들 수 있어요. 총130·전공${s.rules.major}학점과 필수과목은 계속 확인해야 합니다.`:'이미 이수한 MSC를 기준으로 보면 비인증으로 바꿔도 줄어드는 부족학점이 없어요.'}</p><div class="academic-insight">${s.capacityRisk||s.lowGpa?'학점 여유·수강상한을 먼저 점검하고 지도교수와 두 경로를 비교해 보세요.':'현재 정보만으로 인증 포기를 권하지 않아요. 남은 과목과 추가 인증요건부터 확인해 보세요.'}</div><p class="guided-footnote">졸업 확률을 임의로 계산하거나 낮은 성적만으로 포기를 결정하지 않습니다. 아래 선택은 추천 시나리오이며 학적 변경·포기 신청이 아닙니다.</p><div class="guided-actions">${button('인증 유지 경로로 추천','plan-certified','primary-button')}${button('비인증 가정으로 추천','plan-noncertified','secondary-button')}</div>`,{back:'summary'});
 }
 function plan(route='current'){
  step='plan';lastPlan=null;
  frame('추천받을 학기를 선택해 주세요.',`<form id="advisor-plan" class="guided-form"><div class="guided-fields">${select('advisor-plan-year','학년도',[['','매번 직접 선택'],...Array.from({length:5},(_,i)=>[2026+i,`${2026+i}학년도`])])}${select('advisor-plan-semester','학기',[['','매번 직접 선택'],[1,'1학기'],[2,'2학기']])}${select('advisor-plan-grade','학년',[['','선택'],[1,'1학년'],[2,'2학년'],[3,'3학년'],[4,'4학년']])}${select('advisor-plan-budget','계획할 총학점',[[9,'9학점'],[12,'12학점'],[15,'15학점'],[18,'18학점']],18)}${select('advisor-plan-route','인증 경로',[['current','현재 과정 기준'],['certified','인증 유지 가정'],['noncertified','비인증 전환 가정']],route)}${select('advisor-plan-interest','우선 관심 분야',[['all','주전공 이수'],['ssu','SSU 반도체'],['robot','AI로봇'],['analysis','전산설계·해석 MD']],a().goals[0]||'all')}</div><p class="guided-footnote">현재 수강과목을 통과한다는 조건으로 후보를 추천해요. 실제 개설·시간표·인정 여부는 별도 확인이 필요합니다.</p><p id="guided-error" class="error-message" role="alert" hidden></p><button type="submit" class="primary-button">내 수강 후보 보기 →</button></form>`,{back:'summary'});
 }
 function planResult(){
  step='plan-result';const p=lastPlan;const courses=p.selected.slice(detailPage*4,detailPage*4+4);
  frame(`${p.year}학년도 ${p.semester}학기 수강 후보`, `<p>${p.credits}학점 후보${p.generalReserve?` + 교양 ${p.generalReserve}학점 자리 확보`:''} · ${p.route==='noncertified'?'비인증 전환 가정':p.route==='certified'?'인증 유지 가정':'현재 과정 기준'}</p><div class="brief-course-list">${courses.map(c=>`<div><span><strong>${esc(c.name)}</strong><small>${esc(c.category)} · ${c.credits}학점${c.conditionalOn?.length?' · 선수과목 통과 조건':''}</small></span><em>${c.category==='전공필수'?'필수 우선':'선택 후보'}</em></div>`).join('')||'<p>조건에 맞는 추가 전공 후보가 없어요.</p>'}</div>${p.selected.length>4?`<div class="answer-pager">${button('이전','plan-prev','guided-link')}<span>${detailPage+1}/${Math.ceil(p.selected.length/4)}</span>${button('다음 과목','plan-next','guided-link')}</div>`:''}<p class="guided-footnote">수강 중 과목 통과 조건 · 편성학기 기준. 다른 학기 필수 ${p.deferred.length}과목, 선수 확인 ${p.blocked.length}과목은 이번 후보와 구분합니다. SSU·AI로봇 자체 과목의 개설학기는 자료에 없습니다.</p><div class="guided-actions">${button('미이수 필수 확인','required','primary-button')}${button('학기 다시 선택','plan','secondary-button')}</div>${button('추천 요약 저장','download','guided-link')}`,{back:'summary'});
 }
 function openReview(after='current'){
  reviewAfter=after;reviewPage=0;renderReview();if(!dialog.open)dialog.showModal();
 }
 function renderReview(){
  const rows=a().rows,start=reviewPage*5,shown=rows.slice(start,start+5),audit=auditRows(rows,getProfile(),a().declaredTotal);
  const body=dialog.querySelector('#review-body');
  body.innerHTML=`<p class="review-intro">원본과 비교해 과목명·학점·성적을 확인해 주세요. 현재 교육과정과 이름이 다른 과목도 이수구분에 따라 집계합니다.</p><div class="review-total"><span>${rows.length}개 행 · 취득 합계 <strong>${audit.totals.total}학점</strong></span><label>성적표 총 취득학점<input id="review-total" type="number" min="0" max="300" step="0.5" placeholder="미기재" value="${a().declaredTotal??''}"></label></div><details class="review-gpa-details"><summary>평점 확인 (선택)</summary><div class="review-meta"><label>총 평점 (4.5 만점)<input id="review-gpa" type="number" min="0" max="4.5" step="0.01" value="${a().gpa??''}" placeholder="미입력"></label><label>최근 정규학기 평점<input id="review-last-gpa" type="number" min="0" max="4.5" step="0.01" value="${a().lastRegularGpa??''}" placeholder="미입력"></label></div></details><div class="review-rows">${shown.map((r,j)=>`<article class="review-row ${r.grade==='미확인'?'needs-review':''}" data-row-index="${start+j}"><div class="review-row-top"><label><input type="checkbox" data-row-field="included" ${r.included?'checked':''}>반영</label><span>${esc(r.term)}</span><button type="button" data-remove-row="${start+j}" aria-label="${esc(r.name)} 행 삭제">삭제</button></div><label class="review-name">과목명<input data-row-field="name" list="academic-course-options" value="${esc(r.name)}" aria-label="과목명"></label><div class="review-fields"><label>이수구분<select data-row-field="category">${CATEGORIES.map(c=>`<option ${c===r.category?'selected':''}>${c}</option>`).join('')}</select></label><label>학점<input data-row-field="credits" type="number" min="0" max="30" step="0.5" value="${r.credits??''}"></label><label>성적<select data-row-field="grade">${GRADES.map(g=>`<option ${g===r.grade?'selected':''}>${g}</option>`).join('')}</select></label></div><div class="match-note">${r.code?`과목 연결: ${esc(findCourse(r.code)?.name||r.code)}`:'현재 과목표와 미연결 · 학점 집계에는 포함'}</div>${!r.code?suggestedCourses(r.name).map(c=>`<button class="match-suggestion" type="button" data-match-row="${start+j}" data-match-code="${c.code}">${esc(c.name)}으로 연결</button>`).join(''):''}</article>`).join('')}</div><div class="review-pagination"><button type="button" data-review-page="-1" ${reviewPage===0?'disabled':''}>이전</button><span>${rows.length?start+1:0}~${Math.min(rows.length,start+5)} / ${rows.length}</span><button type="button" data-review-page="1" ${start+5>=rows.length?'disabled':''}>다음 5과목 →</button></div><button type="button" id="review-add" class="guided-link">+ 누락 과목 추가</button><div id="review-errors" class="review-errors" role="status">${audit.errors.map(esc).join('<br>')}</div><label class="review-confirm"><input type="checkbox" id="review-confirmed">누락·중복·학점·성적·평점을 확인했어요.</label><label class="review-save"><input type="checkbox" id="review-save-local" ${a().saveLocal?'checked':''}>분석 기록을 이 브라우저에 저장 <small>선택 사항 · 원본 PDF와 인적사항은 저장하지 않음</small></label><div class="review-actions"><button type="button" data-review-cancel class="secondary-button">취소</button><button type="button" id="review-apply" class="primary-button">확인한 이수내역 적용 →</button></div>`;
 }
 function reviewError(text){dialog.querySelector('#review-errors').textContent=text;dialog.querySelector('#review-errors').scrollIntoView({block:'nearest'});}
 function error(text){const el=panel.querySelector('#guided-error');if(el){el.hidden=false;el.textContent=text;}else toast(text);}
 async function upload(file){
  if(!file)return;controller?.abort();step='reading';controller=new AbortController();reading=true;const signal=controller.signal;
  frame('성적표를 읽고 있어요.',`<p id="pdf-progress-label">PDF 확인 중</p><progress id="pdf-progress" max="100" value="0"></progress><p class="guided-footnote">이미지 인식은 기기에 따라 잠시 걸릴 수 있어요. 결과는 반드시 확인한 뒤 반영합니다.</p>${button('읽기 취소','cancel-read','secondary-button')}`,{back:''});
  try{
   const result=await readTranscript(file,{signal,onProgress:(message,progress)=>{const label=panel.querySelector('#pdf-progress-label');if(label)label.textContent=message;const bar=panel.querySelector('#pdf-progress');if(bar)bar.value=progress;}});
   if(signal.aborted)return;academic={...blankAcademic(),...result,mode:'pdf',goals:result.program?[result.program]:[],goalStatus:result.program?'inprogress':'interested'};step='profile';if(visible)profile();
  }catch(e){if(e.name==='AbortError'){if(controller?.signal===signal)source();return;}if(!visible){step='source';toast('PDF 읽기를 마치지 못했어요. 상담에서 다시 선택해 주세요.');return;}frame('읽은 내용을 확인할 수 없어요.',`<p>${esc(e.message||'PDF를 읽지 못했어요.')}</p><div class="guided-actions">${button('다른 PDF 선택','upload','primary-button')}${button('학기별 입력으로 계속','manual','secondary-button')}</div>`,{back:'source'});}
  finally{if(controller?.signal===signal){reading=false;fileInput.value='';}}
 }
 function download(){
  const s=assessment();const lines=['기계공학전공 개인 이수 점검 · 비공식 참고',`입학 ${getProfile().year} / ${getProfile().certification} / ${a().semesterNo}번째 학기`,`총 ${s.totals.total}/${s.rules?.total??'?'} · 전공 ${s.totals.major}/${s.rules?.major??'?'} · 교양(MSC 제외) ${s.totals.liberal}/${s.rules?.liberal??'?'} · MSC ${s.totals.msc}/${s.rules?.msc??'확인필요'}`,`현행 전공필수 확인 ${13-s.remaining.length}/13, 수강 중 ${s.inProgress.length}`,`취득과 구분한 현재 수강과목: ${a().currentCourses.map(code=>findCourse(code)?.name||code).join(', ')||'미입력'}`,'',...s.remaining.map(c=>`${s.inProgress.some(x=>x.code===c.code)?'[수강 중]':'[남은 필수]'} ${c.name}`)];
  if(lastPlan)lines.push('',`${lastPlan.year}-${lastPlan.semester}학기 / ${lastPlan.route} 가정 / 편성학기 기준`,...lastPlan.selected.map(c=>`${c.name} ${c.credits}학점`));
  lines.push('','실제 개설, 과거 학번 필수·대체 인정, 융합전공 동일인정·트랙, 비교과·논문·상담은 별도 확인. 인증 경로 비교는 학적 변경 신청이 아님.');
  const u=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=u;link.download='기계공학_개인_이수점검.txt';link.click();setTimeout(()=>URL.revokeObjectURL(u),1200);
 }
 function route(action){
  if(action==='close'){hide();return;}
  if(action==='upload'){fileInput.click();return;}
  if(action==='source'){source();return;}
  if(action==='manual'){startManual();return;}
  if(action==='profile'){profile();return;}
  if(action==='cancel-read'){controller?.abort();source();return;}
  if(action==='review'){if(a().rows.length||a().reviewed)openReview('summary');else source();return;}
  if(action==='current'){picker('current');return;}
  if(action==='manual-prev'){manualIndex=Math.max(1,manualIndex-1);picker('manual');return;}
  if(action==='manual-next'||action==='manual-empty'){
   if(action==='manual-empty')a().rows=a().rows.filter(r=>r.term!==termLabel(manualIndex));
   a().coverage=[...new Set([...a().coverage,manualIndex])];
   if(manualIndex<Math.max(1,a().semesterNo-1)){manualIndex++;picker('manual');}else{if(!a().rows.length)a().declaredTotal=0;openReview('current');}return;
  }
  if(action==='add-manual'){a().rows.push(sanitizeRow({name:'',credits:null,category:'기타',grade:'P',term:termLabel(manualIndex)},Date.now()));openReview('manual');return;}
  if(action==='current-empty'){a().currentCourses=[];a().currentCourseCredits={};a().currentConfirmed=true;goals();return;}
  if(action==='current-confirm'){
   if(!a().currentCourses.length){error('과목을 선택하거나 현재 수강 없음을 눌러 주세요.');return;}
   if(a().currentCourses.some(code=>findCourse(code)?.credits===null&&(!Number.isFinite(a().currentCourseCredits[code])||a().currentCourseCredits[code]<=0||a().currentCourseCredits[code]>9))){error('학점이 미기재된 수강과목의 실제 신청학점을 입력해 주세요.');return;}
   a().currentConfirmed=true;goals();return;
  }
  if(action==='goals'){goals();return;}
  if(action==='goals-confirm'){summary();return;}
  if(action==='summary'){summary();return;}
  if(action==='required'){detailPage=0;required();return;}
  if(action==='required-prev'||action==='required-next'){detailPage=Math.max(0,Math.min(Math.ceil(assessment().remaining.length/5)-1,detailPage+(action.endsWith('next')?1:-1)));required();return;}
  if(action==='foundation'){foundation();return;}
  if(action==='beyond'){beyond();return;}
  if(action==='programs'){if(!a().goals.length){goals();return;}detailPage=0;programs();return;}
  if(action==='program-next'){detailPage=(detailPage+1)%a().goals.length;programs();return;}
  if(action==='compare'){compare();return;}
  if(action==='plan'){if(!a().currentConfirmed){picker('current');toast('추천 전에 이번 학기 수강과목을 확인해 주세요.');}else plan();return;}
  if(action==='plan-certified'||action==='plan-noncertified'){if(!a().currentConfirmed){picker('current');return;}plan(action.endsWith('noncertified')?'noncertified':'certified');return;}
  if(action==='plan-prev'||action==='plan-next'){detailPage=Math.max(0,Math.min(Math.ceil(lastPlan.selected.length/4)-1,detailPage+(action.endsWith('next')?1:-1)));planResult();return;}
  if(action==='download'){download();return;}
  if(action==='delete-academic'){controller?.abort();academic=null;lastPlan=null;applyAcademic(null,null);source();toast('성적표에서 가져온 분석 기록을 삭제했어요.');}
 }
 panel.addEventListener('click',e=>{const b=e.target.closest('[data-advisor]');if(b)route(b.dataset.advisor);});
 document.addEventListener('click',e=>{if(e.target.closest('[data-start-advisor]')){e.preventDefault();source();}if(e.target.closest('[data-upload-transcript]')){e.preventDefault();fileInput.click();}if(e.target.closest('[data-manual-transcript]')){e.preventDefault();startManual();}});
 panel.addEventListener('input',e=>{if(e.target.id==='guided-search'){pickerSearch=e.target.value;renderPicker();}if(e.target.dataset.currentCredit){a().currentCourseCredits[e.target.dataset.currentCredit]=e.target.value===''?null:Number(e.target.value);a().currentConfirmed=false;}});
 panel.addEventListener('change',e=>{
  if(e.target.id==='guided-group'){pickerGroup=e.target.value;renderPicker();}
  if(e.target.id==='guide-grade'||e.target.id==='guide-semester'){const g=Number(document.querySelector('#guide-grade').value),s=Number(document.querySelector('#guide-semester').value);if(g&&s)document.querySelector('#guide-semester-no').value=(g-1)*2+s;}
  const code=e.target.dataset.guidedCourse;
  if(code){
   const c=findCourse(code);
   if(pickerMode==='manual'){
    a().rows=a().rows.filter(r=>!(r.code===code&&r.term===termLabel(manualIndex)));
    if(e.target.checked)a().rows.push(sanitizeRow({name:c.name,code:c.code,category:courseCategory(c),credits:c.credits,grade:'P',term:termLabel(manualIndex)},Date.now()));a().reviewed=false;
   }else{a().currentCourses=a().currentCourses.filter(x=>x!==code);if(e.target.checked)a().currentCourses.push(code);a().currentConfirmed=false;}
   renderPicker();
  }
  if(e.target.dataset.goal){const goal=e.target.dataset.goal;a().goals=a().goals.filter(x=>x!==goal);if(e.target.checked)a().goals.push(goal);goals();}
  if(e.target.dataset.goalStatus){a().goalStatuses||={};a().goalStatuses[e.target.dataset.goalStatus]=e.target.value;}
  if(e.target.dataset.recognition){const code=e.target.dataset.recognition;a().recognizedEquivalents=a().recognizedEquivalents.filter(x=>x!==code);if(e.target.checked)a().recognizedEquivalents.push(code);apply();}
 });
 panel.addEventListener('submit',e=>{
  if(e.target.id==='advisor-profile'){
   e.preventDefault();const value=id=>document.querySelector('#'+id).value;
   if(!value('guide-entry')||!value('guide-grade')||!value('guide-semester')||!value('guide-semester-no')){error('입학 연도, 현재 학년·학기, 등록학기를 선택해 주세요.');return;}
   setProfile({year:Number(value('guide-entry')),admission:value('guide-admission'),certification:value('guide-certification')});
   Object.assign(a(),{grade:Number(value('guide-grade')),currentSemester:Number(value('guide-semester')),currentYear:Number(value('guide-current-year')),semesterNo:Number(value('guide-semester-no'))});
   if(a().mode==='manual'&&!a().reviewed){if(a().semesterNo===1){a().declaredTotal=0;openReview('current');}else{manualIndex=1;picker('manual');}}else if(!a().reviewed)openReview('current');else summary();
  }
  if(e.target.id==='advisor-plan'){
   e.preventDefault();const v=id=>document.querySelector('#advisor-plan-'+id).value;
   lastPlan=recommendAcademic(assessment(),a(),{year:v('year'),semester:v('semester'),grade:v('grade'),budget:v('budget'),route:v('route'),interest:v('interest')});
   if(!lastPlan.ok){error(lastPlan.error);return;}detailPage=0;planResult();
  }
 });
 dialog.addEventListener('input',e=>{
  if(e.target.id==='review-save-local'){a().saveLocal=e.target.checked;return;}
  if(['review-gpa','review-last-gpa'].includes(e.target.id)){a()[e.target.id==='review-gpa'?'gpa':'lastRegularGpa']=e.target.value===''?null:Number(e.target.value);a().reviewed=false;dialog.querySelector('#review-confirmed').checked=false;return;}
  if(e.target.id==='review-total'){a().declaredTotal=e.target.value===''?null:Number(e.target.value);a().reviewed=false;return;}
  const rowEl=e.target.closest('[data-row-index]'),field=e.target.dataset.rowField;if(!rowEl||!field)return;const row=a().rows[Number(rowEl.dataset.rowIndex)];
  row[field]=field==='credits'?(e.target.value===''?null:Number(e.target.value)):field==='included'?e.target.checked:e.target.value;
  if(field==='name'){const code=e.target.value.match(/\(([A-Z]{2}\d{4})\)$/)?.[1];const c=findCourse(code||row.name);row.code=c?.code||'';if(c)row.name=c.name;rowEl.querySelector('.match-note').textContent=c?`과목 연결: ${c.name}`:'현재 과목표와 미연결 · 이수구분대로 집계';}
  a().reviewed=false;dialog.querySelector('#review-confirmed').checked=false;
 });
 dialog.addEventListener('click',e=>{
  const pageButton=e.target.closest('[data-review-page]');if(pageButton){reviewPage=Math.max(0,Math.min(Math.ceil(a().rows.length/5)-1,reviewPage+Number(pageButton.dataset.reviewPage)));renderReview();return;}
  const remove=e.target.closest('[data-remove-row]');if(remove){a().rows.splice(Number(remove.dataset.removeRow),1);reviewPage=Math.max(0,Math.min(reviewPage,Math.ceil(a().rows.length/5)-1));a().reviewed=false;renderReview();return;}
  const match=e.target.closest('[data-match-row]');if(match){const c=findCourse(match.dataset.matchCode);Object.assign(a().rows[Number(match.dataset.matchRow)],{code:c.code,name:c.name});a().reviewed=false;renderReview();return;}
  if(e.target.closest('#review-add')){a().rows.push(sanitizeRow({name:'',credits:null,category:'기타',grade:'미확인',term:a().rows.at(-1)?.term||'학기 미확인'},Date.now()));reviewPage=Math.floor((a().rows.length-1)/5);renderReview();return;}
  if(e.target.closest('[data-review-cancel]')||e.target.closest('#review-close')){dialog.close();return;}
  if(e.target.closest('#review-apply')){
   const audited=auditRows(a().rows,getProfile(),reviewAfter==='manual'?null:a().declaredTotal);
   if(a().mode==='pdf'&&a().declaredTotal===null){reviewError('성적표의 총 취득학점을 입력해 과목별 합계와 대조해 주세요.');return;}
   if([a().gpa,a().lastRegularGpa].some(v=>v!==null&&(!Number.isFinite(v)||v<0||v>4.5))){reviewError('평점은 0~4.5 범위로 확인하거나 빈칸으로 남겨 주세요.');return;}
   if(!audited.ok){reviewError(audited.errors.join(' '));return;}
   if(!dialog.querySelector('#review-confirmed').checked){reviewError('원본과 비교한 뒤 확인 체크를 해 주세요.');return;}
   a().saveLocal=dialog.querySelector('#review-save-local').checked;dialog.close();
   if(reviewAfter==='manual'){a().reviewed=false;picker('manual');return;}
   a().reviewed=true;apply();
   if(reviewAfter==='summary')summary();else picker('current');
  }
 });
 fileInput.addEventListener('change',()=>upload(fileInput.files?.[0]));
 function hide(){visible=false;panel.hidden=true;document.querySelector('#messages').hidden=false;}
 return {start:source,hide,resume(){if(step==='reading'){activate();visible=true;panel.hidden=false;return;}if(step==='manual'||step==='current')picker(step);else if(step==='plan-result'&&lastPlan)planResult();else route(step);},get active(){return visible;},get hasHistory(){return history;},getAcademic:()=>academic,
  handleQuestion(text){if(a().reviewed&&/다음\s*학기|뭘.*들|무슨.*들|수강.*추천/.test(text)){route('plan');return true;}if(/성적표|맞춤상담|내\s*성적|이수\s*(?:상태|상황)|졸업\s*(?:분석|가능|할\s*수)|인증\s*포기|8\s*학기/.test(text)){if(a().reviewed){if(/인증|포기/.test(text))compare();else summary();}else source();return true;}return false;},
  clear(){controller?.abort();controller=null;reading=false;academic=null;lastPlan=null;history=false;visible=false;panel.hidden=true;if(dialog.open)dialog.close();fileInput.value='';},
 };
}
