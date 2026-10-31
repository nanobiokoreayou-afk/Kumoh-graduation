import catalog from './data/catalog.js';

export const MAJOR_COURSES = catalog.courses.filter(c => ['전공필수','전공선택'].includes(c.category));
export const REQUIRED_COURSES = MAJOR_COURSES.filter(c => c.category === '전공필수');
export const ELECTIVE_COURSES = MAJOR_COURSES.filter(c => c.category === '전공선택');
// These five prerequisite relationships are separately verified in the 2026 curriculum.
// The workbook itself does not provide a complete prerequisite table.
export const PREREQUISITES = { CA1020:['CA1002'], CA1029:['CA1005'], CA1030:['CA1005'], CA1019:['CA1004'], CA1028:['CA1009'] };
export function recommendCourses(profile, completed, options) {
  if (!profile.year) return {ok:false,error:'먼저 내 정보에서 입학 연도를 선택해 주세요.'};
  if (profile.admission !== 'regular') return {ok:false,error:'편입·전과·재입학·다전공은 개인별 필수과목 인정내역을 먼저 확인해야 해요. 교과목 PDF에서 편성 학기를 참고해 주세요.'};
  if (!Number.isInteger(Number(options.year)) || Number(options.year)<2026 || Number(options.year)>2030 || ![1,2].includes(Number(options.semester))) return {ok:false,error:'추천할 연도와 학기를 직접 선택해 주세요.'};
  if (![1,2,3,4].includes(Number(options.grade))) return {ok:false,error:'추천 학기의 학년을 선택해 주세요.'};
  if (!options.confirmed) return {ok:false,error:'이수한 과목을 모두 표시한 뒤 이수목록 확인에 체크해 주세요.'};
  if (![9,12,15,18].includes(Number(options.budget))) return {ok:false,error:'계획 학점은 9·12·15·18학점 중 선택해 주세요.'};
  const year=Number(options.year), semester=Number(options.semester),grade=Number(options.grade),budget=Number(options.budget);
  const done=new Set(completed.filter(code=>MAJOR_COURSES.some(c=>c.code===code)));
  const missing=REQUIRED_COURSES.filter(c=>!done.has(c.code));
  const completedEquivalentCodes = catalog.programCourses.filter(c=>c.sameAs.some(code=>done.has(code))).map(c=>c.code);
  function interest(c) {
    if(options.interest==='analysis'&&c.microdegree) return '전산설계·해석 과정 구성과목';
    if(options.interest==='ssu'&&c.ssu) return 'SSU 동일인정 연결과목';
    if(options.interest==='robot'&&c.equivalents.includes('AI로봇')) return 'AI로봇 동일인정 연결과목';
    if(options.interest==='energy'&&(c.linkedRecognition.includes('그린에너지')||/열|유체|에너지/.test(c.name))) return '열유체·에너지 관심 분야';
    return '';
  }
  const available=MAJOR_COURSES.filter(c=>c.semesters.includes(semester)&&c.year<=grade&&!done.has(c.code)).map(c=>{
    const unmet=(PREREQUISITES[c.code]||[]).filter(code=>!done.has(code));
    const required=c.category==='전공필수';
    const interestReason=interest(c);
    return {...c,unmetPrerequisites:unmet,priority:required?(c.year<grade?0:1):2,interestReason,
      reason:required?(c.year<grade?'이전 학년 미이수 전공필수':'해당 학년 미이수 전공필수'):interestReason||'편성 학기에 맞는 전공선택'};
  }).sort((a,b)=>a.priority-b.priority||(Boolean(b.interestReason)-Boolean(a.interestReason))||a.year-b.year||a.code.localeCompare(b.code));
  const blocked=available.filter(c=>c.unmetPrerequisites.length);
  const candidates=available.filter(c=>!c.unmetPrerequisites.length);
  let credits=0;
  const selected=[],alternatives=[];
  for(const c of candidates) {
    if(credits+c.credits<=budget){selected.push(c);credits+=c.credits;}else alternatives.push(c);
  }
  const deferred=missing.filter(c=>!c.semesters.includes(semester)&&c.year<=grade);
  const future=missing.filter(c=>c.year>grade);
  return {ok:true,year,semester,grade,budget,credits,selected,alternatives,blocked,deferred,future,missing,
    requiredCount:selected.filter(c=>c.category==='전공필수').length,electiveCount:selected.filter(c=>c.category==='전공선택').length,
    completedCount:done.size,completedEquivalentCodes};
}
