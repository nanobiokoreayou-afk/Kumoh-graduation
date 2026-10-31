import catalog from './data/catalog.js';

const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clean = value => value.toLowerCase().replace(/\s+/g,'');
const table = (heads, rows) => `<table class="answer-table"><thead><tr>${heads.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const note = text => `<div class="answer-note">${text}</div>`;
const result = (title,html,sources,topic='workbook',followups=[]) => ({sections:[{title,html}],sources,topic,followups,needsProfile:false});
const period = c => c.semesters.length ? `${c.year ? c.year+'학년 ' : '전학년 '}${c.semesters.join('·')}학기` : '학년·학기 미기재';

export function majorCourseTable(elective=false) {
  const list=catalog.courses.filter(c=>c.category===(elective?'전공선택':'전공필수'));
  return `<p>현행 목록: ${list.length}과목 · ${list.reduce((a,c)=>a+c.credits,0)}학점 편성</p>`+table(['과목 · 코드','학점','편성'],list.map(c=>[`${c.name} (${c.code})`,c.credits,period(c)]));
}

export function answerWorkbook(text,profile) {
  const q=clean(text);
  if (/취업진로|진로교육|취업교육|비교과/.test(q)) {
    const html='<p>엑셀 기준 기본 이수대상은 <strong>서로 다른 취업진로교육 8개 과정</strong>입니다. 편입생은 3~4학년 4개 과정을 안내합니다.</p>'+table(['학년','과정명'],[['1학년','Ⅰ-1 · Ⅰ-2'],['2학년','Ⅱ-1 · Ⅱ-2'],['3학년','Ⅲ-1 · Ⅲ-2'],['4학년','Ⅳ-1 · Ⅳ-2']])+'<ul><li>학기당 최대 3개 과정까지 이수 가능</li><li>같은 과정을 반복 수강해도 1개 과정만 인정</li><li>한 과정의 5회 교육 중 한 회차를 수강하면 해당 과정 이수</li></ul><p>2019학년도 경과조치, 교환학생·학기제 현장실습, 휴학·복학, 편입·재입학, 조기취업·조기졸업에는 인정 예외가 있습니다. 본인의 이수내역과 적용 대상은 별도로 확인하세요.</p>'+note('원본 A52의 “1학기” 표기는 Ⅰ-2~Ⅳ-2 과정명과 일치하지 않습니다. 확정 일정으로 사용하지 않고, 이번 학기 운영 안내에서 교육일을 확인하세요.')+'<p>비교과 점검에는 지도교수 상담·학습성과 제출도 함께 확인해 주세요.</p>';
    return result('취업진로교육·비교과 이수',html,['workbookGraduation'],'career',['지도교수 상담도 알려줘','졸업 전 준비할 것']);
  }
  // Match explicit course codes first, then the longest name. Avoid treating 열역학
  // inside 응용열역학 or SSU열역학 as a separate course.
  const all=[...catalog.courses,...catalog.programCourses];
  const codes=[...text.toUpperCase().matchAll(/\b[A-Z]{2}\d{4}\b/g)].map(m=>m[0]);
  let matched=all.filter(c=>codes.includes(c.code));
  if(!codes.length) {
    let remaining=q;
    for(const c of [...all].sort((a,b)=>b.name.length-a.name.length)) {
      const name=clean(c.name).replace(/\(캡스톤디자인\)/g,'');
      if(remaining.includes(name)){matched.push(c);remaining=remaining.replace(name,'');}
    }
  }
  if(matched.length) {
    const sections=matched.slice(0,8).map(c=>{
      let html=table(['항목','엑셀 기재 내용'],[['과목코드',c.code],['이수구분',c.category||`${c.program} 융합전공 · 필수/선택 ${c.required||'미기재'}`],['학점',c.credits===null?'미기재':`${c.credits}학점`],['편성 학년·학기',period(c)]]);
      if(c.category) {
        html+=`<p>인증: ${esc(c.certified||'미기재')} / 비인증: ${esc(c.noncertified||'미기재')}${c.designCredits?` · 설계 ${c.designCredits}학점`:''}</p>`;
        const links=[c.ssu,c.equivalents,c.microdegree&&`마이크로디그리: ${c.microdegree}`,c.linkedRecognition&&`연계전공: ${c.linkedRecognition}`].filter(Boolean);
        if(links.length)html+=`<p><strong>연결 정보</strong><br>${links.map(esc).join('<br>')}</p>`;
        html+=note('현행 과목 편성 정보이며 실제 개설 확정표는 아닙니다. 과거 입학자의 필수 여부·이수구분과 동일·대체 인정은 개별 확인하세요.');
      } else {
        if(c.sameAs.length)html+=`<p><strong>동일인정 연결:</strong> ${c.sameAs.map(id=>{const target=catalog.courses.find(t=>t.code===id);return esc(`${target?.name||''} (${id})`);}).join(', ')}</p>`;
        if(c.note)html+=`<p>${esc(c.note)}</p>`;
        html+=note('융합전공 시트의 학년·학기·학점은 비어 있습니다. 동일인정되는 기계공학 과목의 학점·학기를 대신 적용하지 않습니다. 인정 승인과 학점 상한도 별도로 확인해야 합니다.');
      }
      return {title:c.name,html};
    });
    return {sections,sources:[...new Set(matched.map(c=>c.program?'workbookPrograms':'workbookCourses'))],topic:'course',followups:['다음 학기 수강 추천','융합전공 이수 기준 알려줘'],needsProfile:false};
  }
  if(/ssu|반도체융합|ai로봇|airo|융합전공|복수전공|부전공|다전공|마이크로디그리|\bmd\b|전산설계.*해석마스터|연계전공|동일인정|중복인정/.test(q)) {
    let programs=catalog.programs;
    const predicates=[[/ssu|반도체/,p=>p.name.includes('SSU')],[/ai로봇|airo/,p=>p.name.includes('AI로봇')],[/복수전공/,p=>p.name==='복수전공'],[/부전공/,p=>p.name==='부전공'],[/마이크로디그리|\bmd\b|전산설계.*해석마스터/,p=>p.name==='마이크로디그리'],[/연계전공/,p=>p.name==='연계전공']].filter(([re])=>re.test(q));
    if(predicates.length)programs=programs.filter(p=>predicates.some(([,fn])=>fn(p)));
    let html=table(['과정','이수 기준','동일·중복 인정'],programs.map(p=>[p.name,p.requirement,p.recognition]));
    for(const p of programs)html+=`<p><strong>${esc(p.name)}</strong>: ${esc(p.application)}. ${esc(p.mechanical)}. ${esc(p.note)}.</p>`;
    if(programs.some(p=>p.name==='마이크로디그리'))html+='<p>전산설계 및 해석마스터는 구성 후보 5과목 중 이수요건 12학점입니다. 5과목 전체가 필수라는 의미는 아니며, 조합·인정 절차를 확인하세요.</p>';
    if(programs.some(p=>/SSU|AI로봇/.test(p.name)))html+='<p>PDF에 SSU 121과목, AI로봇 51과목의 전체 목록을 실었습니다. 융합전공 과목 자체의 학년·학기·학점은 원본에 없어 다음 학기 개설을 추정하지 않아요. 과목코드로 물어보면 동일인정 연결을 안내해 드려요.</p>';
    html+=note('업로드 엑셀의 학적 시트 기준입니다. 주전공 졸업요건은 별도로 충족해야 하며, 동일인정 한도를 총 이수학점에 더하거나 MD·융합전공으로 주전공 필수과목을 자동 대체하지 않습니다.');
    return result('추가 전공·융합과정 이수 기준',html,['workbookPrograms'],'programs',['SSU반도체융합전공 기준','AI로봇 융합전공 기준','마이크로디그리 기준']);
  }
  if(/학사경고|제적|수강상한|수강신청.*최대|최대.*수강|21학점|18학점/.test(q)) {
    return result('학적·수강학점 확인', '<p>업로드한 학적 시트는 일반 수강신청을 <strong>18학점 이내</strong>, 직전 학기 평점평균 4.3 이상이면 21학점까지로 설명합니다. 학사경고 등 제한과 별도 예외는 확인해야 합니다.</p><p>학사경고 기준은 해당 학기 평점평균 1.75 미만이며, 최종 학기·초과 학기 예외가 있습니다. 연속 2회 경고 시 15학점 제한, 통산 4회 시 제적 관련 기준도 기재되어 있습니다. 정확한 적용은 학적과 최신 규정 확인이 필요합니다.</p>'+note('개인 평점·경고내역을 확인하지 않으므로 이 챗봇은 수강 가능 학점이나 제적 여부를 자동 판정하지 않습니다.'),['workbookGraduation'],'academic');
  }
  return null;
}
