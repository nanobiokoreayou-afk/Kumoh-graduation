import catalog from './data/catalog.js';
import {MAJOR_COURSES, REQUIRED_COURSES, ELECTIVE_COURSES,recommendCourses} from './recommendations.js';

export function initPlanner({getProfile,getRecord,persist,toast,escape,icon}) {
  const $=selector=>document.querySelector(selector);
  let lastPlan=null;
  let filter='required';
  function current(){const r=getRecord();if(!Array.isArray(r.completedCourses))r.completedCourses=[];return r;}
  function renderList(){
    const term=$('#course-search').value.trim().toLowerCase();
    const r=current();
    let list=filter==='required'?REQUIRED_COURSES:ELECTIVE_COURSES;
    list=list.filter(c=>(c.name+c.code).toLowerCase().includes(term));
    $('#course-selection-list').innerHTML=list.map(c=>`<label class="course-check"><input type="checkbox" data-course="${c.code}" ${r.completedCourses.includes(c.code)?'checked':''}><span><strong>${escape(c.name)}</strong><small>${c.code} · ${c.credits}학점 · ${c.year}학년 ${c.semesters.join('·')}학기</small></span></label>`).join('')||'<p class="empty-state">검색 결과가 없어요.</p>';
    const required=REQUIRED_COURSES.filter(c=>r.completedCourses.includes(c.code));
    const elective=ELECTIVE_COURSES.filter(c=>r.completedCourses.includes(c.code));
    $('#completion-summary').innerHTML=`<span>전공필수 <strong>${required.length}/13과목</strong> · ${required.reduce((s,c)=>s+c.credits,0)}학점</span><span>전공선택 <strong>${elective.length}과목</strong> · ${elective.reduce((s,c)=>s+c.credits,0)}학점</span>`;
    $('#completed-confirmed').checked=Boolean(r.completionConfirmed);
    document.querySelectorAll('[data-course-filter]').forEach(b=>{b.classList.toggle('selected',b.dataset.courseFilter===filter);b.setAttribute('aria-pressed',String(b.dataset.courseFilter===filter));});
  }
  function render({resetTerm=false}={}) {
    if(resetTerm){$('#plan-year').value='';$('#plan-semester').value='';lastPlan=null;$('#plan-result').replaceChildren();}
    $('#planner-profile').innerHTML=getProfile().year?`<strong>${getProfile().year}학년도 입학</strong> · ${getProfile().certification==='certified'?'인증과정':getProfile().certification==='noncertified'?'비인증과정':'인증 여부 미확인'}`:'학적 정보가 아직 없어요. <a href="#chat" data-profile-open>내 정보 선택하기 →</a>';
    renderList();
  }
  function options(){return {year:$('#plan-year').value,semester:$('#plan-semester').value,grade:$('#plan-grade').value,budget:$('#plan-budget').value,interest:$('#plan-interest').value,confirmed:$('#completed-confirmed').checked};}
  function createPlan(){return recommendCourses(getProfile(),current().completedCourses,options());}
  function courseCard(c,kind='candidate'){
    const eq=[c.ssu,c.equivalents].filter(Boolean).join(' / ');
    return `<article class="plan-course"><div class="plan-course-top"><span class="course-type ${c.category==='전공필수'?'required':'elective'}">${c.category}</span><span>${c.credits}학점</span></div><h3>${escape(c.name)}</h3><p class="course-code">${c.code} · ${c.year}학년 ${c.semesters.join('·')}학기 편성</p><p class="recommend-reason">${escape(c.reason||'다른 학기 편성 전공필수')}</p>${c.unmetPrerequisites?.length?`<p class="prerequisite-note">선수 확인: ${c.unmetPrerequisites.map(id=>escape(MAJOR_COURSES.find(x=>x.code===id)?.name||id)).join(', ')} 미이수</p>`:''}${eq?`<details><summary>동일인정 연결 보기</summary><p>${escape(eq)}</p><small>승인·한도·이수구분을 확인해야 하며 자동 이수 처리하지 않아요.</small></details>`:''}</article>`;
  }
  function resultHtml(plan){
    const group=(title,courses,description='')=>courses.length?`<div class="plan-group"><h3>${title} <span>${courses.length}</span></h3>${description?`<p class="field-hint">${description}</p>`:''}<div class="plan-course-grid">${courses.map(c=>courseCard(c)).join('')}</div></div>`:'';
    return `<div class="plan-result-heading"><div><div class="section-eyebrow">YOUR COURSE PLAN</div><h2>${plan.year}학년도 ${plan.semester}학기 수강 후보</h2><p>전공필수 ${plan.requiredCount}과목 + 전공선택 ${plan.electiveCount}과목 · ${plan.credits}/${plan.budget}학점 계획</p></div><button type="button" id="plan-download" class="text-button">${icon('download')}계획 저장</button></div><div class="availability-banner">교육과정 편성학기 기준입니다. 실제 개설·시간표·수강 제한은 미확정이며 수강신청이 완료된 계획은 아닙니다.</div>${plan.selected.length?group('먼저 고려할 과목',plan.selected):'<p class="empty-state">선택한 학년·학기에 해당하는 미이수 전공 후보가 없습니다.</p>'}${group('추가로 고를 수 있는 전공과목',plan.alternatives,'계획 학점 범위를 넘어서 별도로 표시했어요.')}${group('선수과목 확인 후 고려할 과목',plan.blocked,'확인된 선수과목이 이수목록에 없어 우선 계획에서 제외했어요.')}${group('다른 학기에 편성된 미이수 필수',plan.deferred,'이번 학기 후보에 섞지 않고 다음 수강 기회를 확인하도록 표시해요.')}<div class="result-footer">전공필수 미이수 ${plan.missing.length}과목 중 ${plan.future.length}과목은 이후 학년 편성입니다. 이수 체크는 학생 입력이며 개인별 필수·대체 인정의 최종 확인이 필요해요. 선수조건은 확인된 일부 관계만 반영합니다.</div><div class="plan-extra"><h3>비교과도 함께 챙기세요.</h3><p>취업진로교육과 지도교수 상담 이수내역을 확인하세요. ${getProfile().year>=2025?'사회봉사1 이수도 확인하세요. ':''}졸업학기라면 논문·학습성과 제출 일정을 함께 점검해요.</p><a href="docs/kit-graduation-guide.pdf" target="_blank" rel="noopener">졸업·비교과 안내 PDF 보기 →</a></div>`;
  }
  $('#course-selection-list').addEventListener('change',event=>{
    const code=event.target.dataset.course;if(!code)return;
    const r=current();r.completedCourses=r.completedCourses.filter(c=>c!==code);if(event.target.checked)r.completedCourses.push(code);
    r.completionConfirmed=false;lastPlan=null;$('#plan-result').replaceChildren();persist();renderList();
  });
  document.querySelectorAll('[data-course-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.courseFilter;renderList();}));
  $('#course-search').addEventListener('input',renderList);
  $('#completed-confirmed').addEventListener('change',()=>{current().completionConfirmed=$('#completed-confirmed').checked;lastPlan=null;$('#plan-result').replaceChildren();persist();});
  $('#plan-controls').addEventListener('change',()=>{lastPlan=null;$('#plan-result').replaceChildren();});
  $('#plan-form').addEventListener('submit',event=>{
    event.preventDefault();const plan=createPlan();$('#plan-error').hidden=plan.ok;
    if(!plan.ok){$('#plan-error').textContent=plan.error;return;}
    lastPlan=plan;$('#plan-result').innerHTML=resultHtml(plan);$('#plan-result').scrollIntoView({behavior:'instant',block:'start'});
  });
  $('#plan-result').addEventListener('click',event=>{
    if(!event.target.closest('#plan-download')||!lastPlan)return;
    const p=lastPlan;
    const lines=[`${p.year}학년도 ${p.semester}학기 수강 후보`,`${getProfile().year}학년도 입학 / 추천 학년 ${p.grade} / 계획 ${p.credits}학점`, '교육과정 편성학기 기준, 실제 개설·시간표·수강제한 미확정','',...p.selected.map(c=>`${c.category} | ${c.name} (${c.code}) | ${c.credits}학점 | ${c.reason}`),'','다른 학기에 편성된 미이수 필수',...p.deferred.map(c=>`${c.name} (${c.code}) / ${c.semesters.join('·')}학기`),'','출처: 교과목 자료.xlsx / 필수 과목·선택 과목 시트 / 검토일 2026-10-30','동일·대체 인정, 선수과목, 비교과·상담·논문 요건은 별도 확인 필요'];
    const u=URL.createObjectURL(new Blob(['\uFEFF'+lines.join('\n')],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download=`수강후보_${p.year}-${p.semester}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1200);toast('수강 후보를 저장했어요.');
  });
  function chatAnswer(text){
    if(!/추천|다음\s*학기|수강\s*계획|미이수|못\s*들은|안\s*들은/.test(text))return null;
    if(!lastPlan)return {topic:'planner',sections:[{title:'내 이수목록으로 다음 학기를 계획해요.',html:'<p>수강 추천에서 <strong>연도·학기·학년</strong>을 직접 선택하고, 이수한 전공필수·선택 과목을 표시해 주세요. 미이수 필수를 먼저 고려하고 같은 학기 전공선택을 함께 추천해요.</p><p><a class="text-button" href="#planner">수강 추천 시작하기 →</a></p><div class="answer-note">엑셀의 편성 학기를 사용합니다. 실제 개설 확정표가 없어 개설을 보장하지 않으며, 학기·학점이 비어 있는 융합전공 과목은 임의 추천하지 않아요.</div>'}],sources:['workbookCourses'],followups:[]};
    return {topic:'planner',sections:[{title:`${lastPlan.year}학년도 ${lastPlan.semester}학기 수강 후보`,html:`<p>방금 확인한 이수목록 기준으로 ${lastPlan.credits}학점의 전공과목을 제안해요.</p><ul>${lastPlan.selected.map(c=>`<li><strong>${escape(c.name)}</strong> · ${c.category} ${c.credits}학점 · ${escape(c.reason)}</li>`).join('')}</ul><p>다른 학기에 편성된 미이수 필수 ${lastPlan.deferred.length}과목은 수강 추천 화면에서 확인할 수 있어요.</p><div class="answer-note">편성 학기 기준 후보이며 실제 개설·수강 가능 여부는 별도 확인해야 합니다.</div>`}],sources:['workbookCourses'],followups:['취업진로교육도 알려줘']};
  }
  return {render,chatAnswer,invalidate(){lastPlan=null;$('#plan-result').replaceChildren();render();}};
}
