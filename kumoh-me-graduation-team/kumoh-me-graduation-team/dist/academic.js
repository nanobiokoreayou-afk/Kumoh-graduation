import catalog from './data/catalog.js';
import {getRules} from './knowledge.js';
import {REQUIRED_COURSES} from './recommendations.js';

export const COURSES=[...catalog.courses,...catalog.programCourses];
export const CATEGORIES=['전필','전선','교필','교선','기필','기선','융합','일선','기타'];
export const GRADES=['A+','A','B+','B','C+','C','D+','D','F','S','P','U','NP','미확인'];
export const norm=s=>String(s||'').normalize('NFKC').toUpperCase().replace(/\(캡스톤디자인\)/g,'').replace(/[\s·ㆍ()（）\-_,.]/g,'');
export function findCourse(nameOrCode){const v=norm(nameOrCode);return COURSES.find(c=>norm(c.code)===v||norm(c.name)===v)||null;}
export function suggestedCourses(name){
 const value=norm(name);if(value.length<2)return [];
 return COURSES.map(c=>{const n=norm(c.name);let score=0;for(let i=0;i<value.length-1;i++)if(n.includes(value.slice(i,i+2)))score++;return {c,score:score/Math.max(value.length-1,n.length-1)};}).filter(x=>x.score>=.42).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.c);
}
export function courseCategory(c){if(!c)return '기타';if(c.program)return '융합';return c.category==='전공필수'?'전필':c.category==='전공선택'?'전선':c.category==='학문기초'?'기필':c.category==='기초교양'?'교필':'교선';}
export const passed=grade=>/^(?:[ABCD](?:\+|0|O)?|S|P)$/i.test(String(grade||'').trim());
export const failed=grade=>/^(F|U|NP)$/i.test(String(grade||'').trim());
export function bucket(row,profile){
 const c=findCourse(row.code||row.name);
 if(['기필','기선'].includes(row.category))return 'msc';
 if(c?.category==='학문기초' || (Number(profile.year)<=2024 && c?.code==='LA0366'))return 'msc';
 if(['전필','전선'].includes(row.category))return row.category==='전필'?'majorRequired':'majorElective';
 if(['교필','교선'].includes(row.category))return row.category==='교필'?'liberalCommon':'liberalElective';
 return 'other';
}
export function sanitizeRow(row,index=0){
 const code=COURSES.some(c=>c.code===row.code)?row.code:'';
 return {id:String(row.id||`row-${index}`).slice(0,60),name:String(row.name||'').slice(0,100),code,category:CATEGORIES.includes(row.category)?row.category:'기타',credits:row.credits!==null&&row.credits!==''&&row.credits!==undefined&&Number.isFinite(Number(row.credits))&&Number(row.credits)>=0&&Number(row.credits)<=30?Number(row.credits):null,grade:GRADES.includes(row.grade)?row.grade:'미확인',term:String(row.term||'학기 미확인').slice(0,40),year:Number(row.year)||null,semester:row.semester||null,included:row.included!==false};
}
export function auditRows(rows,profile,declaredTotal=null){
 const selected=rows.filter(r=>r.included!==false),errors=[];
 if(declaredTotal!==null&&declaredTotal!==''&&(!Number.isFinite(Number(declaredTotal))||Number(declaredTotal)<0||Number(declaredTotal)>300))errors.push('성적표 총 취득학점은 0~300 사이로 입력해 주세요.');
 if(!selected.length&&declaredTotal!==0)errors.push('이수내역을 한 과목 이상 입력해 주세요.');
 if(selected.some(r=>!r.name||r.credits===null||!Number.isFinite(r.credits)||r.credits<0||r.credits>30))errors.push('과목명과 학점을 확인해 주세요.');
 if(selected.some(r=>!passed(r.grade)&&!failed(r.grade)))errors.push('성적 미확인 과목이 있어요. 성적을 확인하거나 해당 행을 제외해 주세요.');
 const keys=new Set(),duplicates=[];const accepted=[];
 for(const row of selected){
  if(!passed(row.grade))continue;
  const key=row.code||norm(row.name);
  // Zero-credit recurring advising passes are not duplicate-credit errors.
  if(keys.has(key)&&row.credits>0){duplicates.push(row);continue;}
  keys.add(key);accepted.push(row);
 }
 if(duplicates.length)errors.push('같은 과목이 중복되어 있어요. 재수강·중복 행에서 최종 인정되는 한 행만 남겨 주세요.');
 const totals={total:0,majorRequired:0,majorElective:0,msc:0,liberalCommon:0,liberalElective:0,other:0};
 for(const row of accepted){totals.total+=row.credits||0;totals[bucket(row,profile)]+=row.credits||0;}
 totals.major=totals.majorRequired+totals.majorElective;totals.liberal=totals.liberalCommon+totals.liberalElective;
 const mismatch=declaredTotal!==null && declaredTotal!=='' && Math.abs(Number(declaredTotal)-totals.total)>.01;
 if(mismatch)errors.push(`과목별 합계 ${totals.total}학점과 성적표 합계 ${Number(declaredTotal)}학점이 달라요. 누락·중복·성적을 확인해 주세요.`);
 return {ok:errors.length===0,errors,totals,accepted,duplicates,mismatch,unmatched:accepted.filter(r=>!findCourse(r.code||r.name))};
}
export function assessAcademic(profile,academic){
 const audit=auditRows(academic.rows||[],profile,academic.declaredTotal);
 const rules=getRules(profile);const eligible=Boolean(rules&&profile.admission==='regular'&&academic.reviewed&&audit.ok);
 const done=new Set(audit.accepted.map(r=>findCourse(r.code||r.name)?.code).filter(Boolean));
 // Equivalent courses count only after an explicit recognition confirmation.
 for(const r of audit.accepted){const c=findCourse(r.code||r.name);if(c?.sameAs&&academic.recognizedEquivalents?.includes(c.code))for(const code of c.sameAs)done.add(code);}
 const current=new Set((academic.currentCourses||[]).filter(code=>COURSES.some(c=>c.code===code)));
 const remaining=REQUIRED_COURSES.filter(c=>!done.has(c.code));
 const inProgress=remaining.filter(c=>current.has(c.code));
 const missing=remaining.filter(c=>!current.has(c.code));
 const deficits=rules?{total:Math.max(0,rules.total-audit.totals.total),major:Math.max(0,rules.major-audit.totals.major),liberal:Math.max(0,rules.liberal-audit.totals.liberal),msc:rules.msc===null?null:Math.max(0,rules.msc-audit.totals.msc)}:null;
 const semesterNo=Number(academic.semesterNo)||null;
 const afterCurrent=semesterNo?Math.max(0,8-semesterNo):null;
 const currentCredits=current.size?[...current].filter(code=>!done.has(code)).reduce((s,code)=>s+(academic.currentCourseCredits?.[code]??COURSES.find(c=>c.code===code)?.credits??0),0):0;
 const capacity=afterCurrent===null?null:afterCurrent*18+(academic.currentConfirmed?currentCredits:18);
 const capacityRisk=eligible&&capacity!==null&&deficits.total>capacity;
 const loadPerRemaining=afterCurrent?Math.ceil(Math.max(0,(deficits?.total||0)-currentCredits)/afterCurrent*10)/10:null;
 const lowGpa=academic.lastRegularGpa!==null&&academic.lastRegularGpa!==undefined&&Number(academic.lastRegularGpa)<1.75;
 const mscCompare=rules?{certified:Math.max(0,rules.mscCertified-audit.totals.msc),noncertified:Math.max(0,rules.mscNoncertified-audit.totals.msc)}:null;
 const designCredits=[...done].reduce((s,code)=>s+(catalog.courses.find(c=>c.code===code)?.designCredits||0),0);
 const programs={};
 for(const key of ['ssu','robot','analysis']){
  const program=key==='ssu'?'SSU':'AIRO';
  const directRows=audit.accepted.filter(r=>{const c=findCourse(r.code||r.name);return key==='analysis'?Boolean(c?.microdegree):c?.program===program;});
  const direct=directRows.reduce((s,r)=>s+r.credits,0);
  const potential=key==='analysis'?[]:audit.accepted.filter(r=>{const c=findCourse(r.code||r.name);return !c?.program&&catalog.programCourses.some(p=>p.program===program&&p.sameAs.includes(c?.code)&&!done.has(p.code));}).map(r=>({row:r,course:findCourse(r.code||r.name)}));
  programs[key]={direct,required:key==='ssu'?36:key==='robot'?30:12,potential,cap:key==='ssu'?15:key==='robot'?9:null,secondYearCap:key==='ssu'?9:null};
 }
 return {...audit,eligible,rules,done:[...done],remaining,inProgress,missing,deficits,semesterNo,afterCurrent,currentCredits,capacity,capacityRisk,loadPerRemaining,lowGpa,mscCompare,designCredits,programs,
  counselingCount:audit.accepted.filter(r=>/지도교수상담/.test(r.name)).length};
}
export function recommendAcademic(assessment,academic,options){
 if(!assessment.eligible)return {ok:false,error:'학적 정보와 성적표 이수내역을 먼저 확인해 주세요.'};
 if(![1,2].includes(Number(options.semester))||Number(options.year)<2026||Number(options.year)>2030)return {ok:false,error:'추천받을 연도와 학기를 선택해 주세요.'};
 if(![1,2,3,4].includes(Number(options.grade)))return {ok:false,error:'추천받을 학년을 선택해 주세요.'};
 if(![9,12,15,18].includes(Number(options.budget)))return {ok:false,error:'계획할 총학점을 9·12·15·18 중 선택해 주세요.'};
 if(Number(options.year)*2+Number(options.semester)<=Number(academic.currentYear)*2+Number(academic.currentSemester))return {ok:false,error:'현재 학기 이후의 추천 학기를 선택해 주세요.'};
 if(!academic.currentConfirmed)return {ok:false,error:'현재 수강 중인 과목부터 확인해 주세요.'};
 const done=new Set(assessment.done),ongoing=new Set(academic.currentCourses||[]);
 const considered=new Set([...done,...ongoing]);
 const semester=Number(options.semester),grade=Number(options.grade),budget=Number(options.budget)||18;
 const conditional=[],required=[],elective=[],foundation=[];
 const route=options.route==='current'?assessment.rules.msc===null?'unknown':assessment.rules.msc===assessment.rules.mscCertified?'certified':'noncertified':options.route;
 const mscNeed=route==='unknown'?null:Math.max(0,(route==='noncertified'?assessment.rules.mscNoncertified:assessment.rules.mscCertified)-assessment.totals.msc);
 const currentLiberal=[...ongoing].filter(code=>!done.has(code)).reduce((sum,code)=>{const c=findCourse(code);return c&&!c.program&&!/전공|학문기초/.test(c.category)&&!(Number(assessment.rules.year)<=2024&&c.code==='LA0366')?sum+(academic.currentCourseCredits?.[code]??c.credits??0):sum;},0);
 const generalReserve=Math.min(Math.max(0,assessment.deficits.liberal-currentLiberal),6,budget);
 const courseBudget=budget-generalReserve;
 for(const c of catalog.courses){
  if(!c.semesters.includes(semester)||(c.year&&c.year>grade)||considered.has(c.code))continue;
  if(c.category==='전공필수')required.push(c);
  else if(c.category==='전공선택')elective.push(c);
  else if(c.category==='학문기초'&&mscNeed!==null&&mscNeed>0){
   const necessary=route==='noncertified'?c.noncertified==='필수':c.certified==='필수';
   if(necessary)foundation.push(c);
  }
 }
 const relation={CA1020:['CA1002'],CA1029:['CA1005'],CA1030:['CA1005'],CA1019:['CA1004'],CA1028:['CA1009']};
 const blocked=[];
 const interest=c=>(options.interest==='ssu'&&c.ssu)||(options.interest==='robot'&&c.equivalents?.includes('AI로봇'))||(options.interest==='analysis'&&c.microdegree);
 elective.sort((a,b)=>Number(Boolean(interest(b)))-Number(Boolean(interest(a)))||a.year-b.year);
 required.sort((a,b)=>a.year-b.year);
 const selected=[];let credits=0;
 for(const c of [...required,...foundation,...elective]){
  const unmet=(relation[c.code]||[]).filter(code=>!considered.has(code));
  if(unmet.length){blocked.push({...c,unmet});continue;}
  const pending=(relation[c.code]||[]).filter(code=>ongoing.has(code));
  if(credits+c.credits<=courseBudget){selected.push({...c,conditionalOn:pending});credits+=c.credits;if(pending.length)conditional.push(c);}
 }
 return {ok:true,selected,credits,budget,generalReserve,conditional,blocked,deferred:assessment.missing.filter(c=>!c.semesters.includes(semester)),ongoing:[...ongoing],generalGap:assessment.deficits.liberal,year:Number(options.year),semester,route};
}
