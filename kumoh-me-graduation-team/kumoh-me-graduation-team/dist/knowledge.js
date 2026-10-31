import { answerWorkbook, majorCourseTable } from './workbook-answers.js';
// Reviewed against official 2026 curriculum, PDF pages 16–20.
// These values describe that published table; they are not an individual graduation ruling.
export const DATA_REVIEWED = '2026-10-30';
const base = 'https://www.kumoh.ac.kr/mecheng/sub020101.do';
const notice = article => `${base}?articleNo=${article}&mode=view`;
export const SOURCES = {
  workbookGraduation: { title: '졸업요건·비교과 안내', shortTitle: '졸업·비교과 PDF', type: 'PDF', url: 'docs/kit-graduation-guide.pdf', description: '입학 연도별 학점, 교양, 취업진로교육, 인증·상담과 졸업학기 준비', meta: '5쪽 · 엑셀 기본사항·학적 시트 + 공식 자료 보완', downloadable: true },
  workbookCourses: { title: '교과목 편성·수강 가이드', shortTitle: '교과목 PDF', type: 'PDF', url: 'docs/kit-course-catalog.pdf', description: '전공필수 13과목·전공선택 23과목, 교양·MSC와 편성 학기', meta: '11쪽 · 엑셀 필수 과목·선택 과목 시트 · 130개 과목코드', downloadable: true },
  workbookPrograms: { title: '융합전공·추가이수 안내', shortTitle: '융합전공 PDF', type: 'PDF', url: 'docs/kit-convergence-guide.pdf', description: '복수·부·연계전공, 마이크로디그리, SSU·AI로봇 기준과 전체 과목', meta: '11쪽 · 엑셀 학적·SSU·AI로봇 시트', downloadable: true },
  curriculum2026: { title: '2026학년도 교육과정 운영기준 및 편성표', shortTitle: '2026 교육과정 · 17~20쪽', type: 'PDF', url: 'https://mecheng.kumoh.ac.kr/mecheng/sub020101.do?articleNo=570430&attachNo=166048&mode=download', description: '입학 연도별 학점, 기계공학전공 필수과목, 교양·MSC 기준', meta: '2026.02.27 문서 · 기계공학전공 17~20쪽 · 사회봉사 16쪽' },
  certification2026: { title: '2026 공학교육인증 안내서 · 기계공학심화', shortTitle: '2026 인증 안내서 · 23쪽', type: 'PDF', url: 'https://biz.kumoh.ac.kr/abeek/sub040808.do?articleNo=556323&attachNo=162328&mode=download', description: '인증과정의 설계학점, 상담, 졸업설계와 학습성과 최소기준', meta: '2026.03.03 문서 · 졸업최소달성기준 23쪽 · 비인증에 자동 적용하지 않음' },
  guidance2026: { title: '2026-2학기 수강지도상담 안내와 졸업이수기준', shortTitle: '2026-2 수강지도 공지', type: '공지', url: notice(570430), description: '현행 교육과정과 졸업이수기준 첨부자료를 확인하세요.', meta: '2026.07.16 게시 · 첨부 PDF·HWP 확인' },
  thesis: { title: '2026-2학기 졸업논문 심사·제출 안내', shortTitle: '2026-2 졸업논문 공지', type: '공지', url: notice(579298), description: '대상자, 심사 일정, 완성본 제출과 논문 서식 안내', meta: '2026.10.12 게시 · 해당 학기 대상자에게 적용' },
  outcomes: { title: '2027년 2월 졸업예정자 학습성과 평가자료 안내', shortTitle: '2027.2 학습성과 공지', type: '공지', url: notice(579814), description: '기본소양 에세이와 출구면접 설문 제출 안내', meta: '2026.10.19 게시 · 2027년 2월 졸업예정자에게 적용' },
  office: { title: '기계공학전공 사무실·학부 공지사항', shortTitle: '기계공학전공 공식 문의', type: '안내', url: 'https://www.kumoh.ac.kr/mecheng/sub010203.do', description: '개인별 교육과정 적용, 학점 인정, 졸업사정 문의', meta: '테크노관 105호 · 054-478-7290, 7304' },
  notices: { title: '기계공학전공 최신 학부 공지사항', shortTitle: '학부 공지사항', type: '게시판', url: base, description: '수강지도, 졸업논문, 학습성과 등 이후 공지 확인', meta: '기계공학부 기계공학전공 공식 홈페이지' },
  curriculum2025: { show: false, title: '2025학년도 기계공학전공 교육과정', shortTitle: '이전 2025 교육과정', type: 'PDF', url: `${base}?articleNo=506418&attachNo=141012&mode=download`, description: '이전 기준 비교용. 최신 문서의 개인 적용 여부와 구분하세요.', meta: '이전 자료 · 2026 기준과 전공학점·교양 구성 차이 있음' },
};
export const CHECK_ITEMS = [
  { id: 'career', title: '취업진로교육 이수 확인', description: '기본 8개 과정 · 편입·학적별 예외 확인' },
  { id: 'required', title: '전공·교양 필수과목 확인', description: '동일·대체과목과 이수구분 포함' },
  { id: 'design', title: '설계·캡스톤 기준 확인', description: '본인의 인증과정 적용요건 확인' },
  { id: 'thesis', title: '졸업논문 대상·심사 확인', description: '해당 학기 공지와 지도교수 확인' },
  { id: 'outcomes', title: '학습성과·상담 확인', description: '본인에게 적용되는 자료 제출 여부' },
  { id: 'service', title: '사회봉사·기타 요건 확인', description: '2025학년도 이후 사회봉사1 포함' },
];
const CERT_LABELS = { certified: '인증과정', noncertified: '비인증과정', unknown: '인증 여부 미확인' };
const ADMISSION_LABELS = { regular: '일반 신입학', transfer: '편입학', changed: '전과·재입학·다전공 등', returnfirst: '2025년 이후 1-1 복학·재입학' };
export const getProfileKey = p => `${p.year || 'none'}-${p.certification}-${p.admission}`;
export const profileLabel = p => `${p.year ? p.year + '학년도 입학' : '입학 연도 미선택'} · ${CERT_LABELS[p.certification] || CERT_LABELS.unknown}${p.admission !== 'regular' ? ' · ' + (ADMISSION_LABELS[p.admission] || '학적 확인 필요') : ''}`;
export function getRules(profile) {
  const year = Number(profile.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2026) return null;
  const newer = year >= 2025;
  const certified = profile.certification === 'certified';
  const unknown = !['certified', 'noncertified'].includes(profile.certification);
  return { year, newer, cohort: newer ? '2025학년도 이후' : year >= 2015 ? '2015~2024학년도' : '2014학년도 이전', total: 130, major: year <= 2014 ? 65 : 71, majorRequired: newer ? 32 : null, majorElective: newer ? 39 : null, liberal: newer ? 27 : 20, msc: unknown ? null : newer ? (certified ? 29 : 17) : (certified ? 32 : 20), mscCertified: newer ? 29 : 32, mscNoncertified: newer ? 17 : 20, liberalCommon: newer ? 8 : 4, liberalElective: newer ? 19 : 16, source: 'curriculum2026' };
}
export function getCreditFields(profile) {
  const rules = getRules(profile);
  return [
    { id: 'total', label: '총 취득학점', required: rules?.total ?? null, hint: '모든 인정학점의 합계' },
    { id: 'majorRequired', label: '전공필수 학점', required: rules?.majorRequired ?? null, unknown: rules ? '개인별 필수 기준 확인' : '학적 정보 선택 필요', hint: rules?.newer ? '기본전공 32 · 과목별 이수도 필요' : '과거 입학자 세부 기준 별도 확인' },
    { id: 'majorElective', label: '전공선택 학점', required: rules?.majorElective ?? null, unknown: rules ? '개인별 선택 기준 확인' : '학적 정보 선택 필요', hint: rules?.newer ? '전공추가이수 선택 경로 39' : '필수와 합쳐 전공 합계 계산' },
    { id: 'liberal', label: '교양 학점 (MSC 제외)', required: rules?.liberal ?? null, hint: rules ? `기초 ${rules.liberalCommon} + 선택 ${rules.liberalElective}` : '기초교양·선택교양' },
    { id: 'msc', label: 'MSC · 학문기초 학점', required: rules?.msc ?? null, hint: '교양 입력값과 중복 제외' },
  ];
}
function majorTotal(credits) {
  const split = credits.majorRequired !== undefined || credits.majorElective !== undefined;
  if (split) return credits.majorRequired !== undefined && credits.majorElective !== undefined ? credits.majorRequired + credits.majorElective : null;
  return credits.major ?? null;
}
export function validateCredits(profile, credits) {
  if (!getRules(profile)) return '입학 연도를 먼저 선택해 주세요.';
  if (profile.admission !== 'regular') return '학적 변동에 따른 개인별 인정내역을 먼저 확인해야 해요.';
  const entries = Object.entries(credits).filter(([key]) => ['total', 'major', 'majorRequired', 'majorElective', 'liberal', 'msc'].includes(key));
  if (!entries.length) return '한 항목 이상의 취득학점을 입력해 주세요.';
  for (const [, value] of entries) if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 300 || value * 2 !== Math.round(value * 2)) return '학점은 0~300 사이에서 0.5학점 단위의 숫자로 입력해 주세요.';
  const split = credits.majorRequired !== undefined || credits.majorElective !== undefined;
  const knownMajor = split ? (credits.majorRequired ?? 0) + (credits.majorElective ?? 0) : (credits.major ?? 0);
  if (credits.major !== undefined && split && (knownMajor > credits.major || (majorTotal(credits) !== null && knownMajor !== credits.major))) return '전공 합계와 필수·선택 학점이 맞지 않아요. 입력값을 확인해 주세요.';
  if (credits.total !== undefined && knownMajor + (credits.liberal ?? 0) + (credits.msc ?? 0) > credits.total) return '전공·교양(MSC 제외)·MSC의 합계가 총 취득학점보다 큽니다. 중복 입력이나 총학점을 확인해 주세요.';
  return '';
}
export function calculateCredits(profile, credits = {}) {
  const error = validateCredits(profile, credits);
  if (error) return { ok: false, error, rows: [] };
  const fields = getCreditFields(profile);
  fields.splice(1,0,{ id: 'major', label: '전공 합계 (필수 + 선택)', required: getRules(profile).major });
  return { ok: true, rows: fields.map(field => {
    const value = field.id === 'major' ? majorTotal(credits) : credits[field.id] ?? null;
    const remaining = value === null || field.required === null ? null : Math.max(0, field.required - value);
    return { ...field, value, remaining, percent: value === null || field.required === null ? 0 : Math.min(100, Math.round(value / field.required * 100)) };
  }) };
}
export function profileFromText(text, current) {
  const profile = { ...current };
  // A four-digit student ID suffix is not treated as an admission year.
  const full = text.match(/(?<!\d)((?:20)\d{2})\s*(?:학년도\s*(?:입학)?|학번|년\s*입학)/);
  const short = text.match(/(?<!\d)(\d{2})\s*학번/);
  const year = full ? Number(full[1]) : short ? 2000 + Number(short[1]) : null;
  if (year >= 2000 && year <= 2026) profile.year = year;
  const lower = text.toLowerCase();
  const comparison = /차이|비교|고민|가정|할까|하면|해도|해볼|바꾸|전환|포기.*(?:싶|추천|어때|어떨|가능)|인증.*(?:비인증|비 인증).*(?:은|와|과)|(?:비인증|비 인증).*인증.*차이/.test(lower);
  if (!comparison) {
    if (/비\s*인증\s*(?:과정|이야|인데|입니다|이고)|인증\s*(?:아니|안\s*해|안\s*하|아님|안\s*받)|인증(?:을)?\s*포기(?:했|한\s*상태)/.test(lower)) profile.certification = 'noncertified';
    else if (/(?:공학\s*)?인증\s*(?:과정|이야|인데|입니다|이고|을\s*이수|으로)|abeek\s*(?:이야|인데|과정|이수)/.test(lower)) profile.certification = 'certified';
    if (/인증.*(?:모르|몰라|미확인)/.test(lower)) profile.certification = 'unknown';
  }
  if (/편입(?:생|학)?\s*(?:이야|인데|입니다|했|한|했고)/.test(text) && !/편입.*(?:아니|아님)/.test(text)) profile.admission = 'transfer';
  else if (/(?:복학|재입학)/.test(text) && /1\s*학년\s*1\s*학기|1\s*[-/]\s*1/.test(text)) profile.admission = 'returnfirst';
  else if (/(?:전과|재입학|복수전공|부전공|다전공)(?:을|를)?\s*(?:했|한\s*학생|중이|중인|이야|인데|입니다|하고\s*있)/.test(text)) profile.admission = 'changed';
  if (/일반\s*신입학|학적\s*변동\s*없/.test(text)) profile.admission = 'regular';
  return { profile, changed: JSON.stringify(profile) !== JSON.stringify(current) };
}
const section = (title, html) => ({ title, html });
const table = (headers, rows) => `<table class="answer-table"><thead><tr>${headers.map(text => `<th scope="col">${text}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(text => `<td>${text}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const note = text => `<div class="answer-note">${text}</div>`;
function findTopics(text, lastTopic) {
  const q = text.toLowerCase().replace(/\s+/g, '');
  const topics = [];
  if (/논문|학습성과|출구|에세이|졸업전준비|학점외|졸업준비|포트폴리오/.test(q)) topics.push('finish');
  if (/영어|외국어|토익|toeic|토플|opic|오픽/.test(q) && !/영어독해|영어읽기/.test(q)) topics.push('english');
  if (/지도교수|정기상담|상담횟수|상담도|몇번상담/.test(q)) topics.push('counseling');
  if (/봉사/.test(q)) topics.push('service');
  if (/설계학점|캡스톤|종합설계/.test(q)) topics.push('design');
  if (/교양|균형|교필|교선|글쓰기|디지털문해|영어읽기|글로벌커뮤니케이션/.test(q)) topics.push('liberal');
  if (/msc|기초도구|학문기초|수학|물리|화학|프로그래밍|확률/.test(q)) topics.push('msc');
  if (/전공|전필|필수과목|열역학|고체역학|유체역학|동역학|기초실험|응용실험|정역학/.test(q) && !/복수전공|부전공|다전공/.test(q)) topics.push('major');
  if (/인증.*차이|차이.*인증|공학교육인증|아빅|abeek/.test(q)) topics.push('certification');
  if (/남은|부족|얼마나|이수현황|계산|졸업가능|졸업할수|졸업돼|졸업되/.test(q)) topics.push('progress');
  if (/자료|출처|근거|규정|pdf|교육과정/.test(q)) topics.push('sources');
  if (/사무실|연락처|전화|담당자|문의처/.test(q)) topics.push('office');
  if (!topics.length && /졸업|총학점|몇학점|요건|조건|정리|한눈|전체|요약/.test(q)) topics.push('overview');
  if (!topics.length && /그럼|그러면|비인증|인증과정|학번|학년도|기준/.test(q)) topics.push(lastTopic || 'overview');
  return [...new Set(topics)];
}
function readInlineCredits(text) {
  const result = {};
  for (const [key, re] of Object.entries({ total: /(?:총(?:\s*취득)?\s*(?:학점)?|전체)\s*(\d+(?:\.\d+)?)\s*(?:학점)?/, majorRequired: /(?:전공\s*필수|전필)\s*(?:학점)?\s*(\d+(?:\.\d+)?)\s*(?:학점)?/, majorElective: /(?:전공\s*선택|전선)\s*(?:학점)?\s*(\d+(?:\.\d+)?)\s*(?:학점)?/, major: /전공\s*(?:학점)?\s*(\d+(?:\.\d+)?)\s*(?:학점)?/, liberal: /교양\s*(?:\(MSC\s*제외\))?\s*(?:학점)?\s*(\d+(?:\.\d+)?)\s*(?:학점)?/i, msc: /(?:MSC|학문기초|기초도구)\s*(\d+(?:\.\d+)?)\s*(?:학점)?/i })) {
    const match = text.match(re);
    if (match) result[key] = Number(match[1]);
  }
  return result;
}
export function answerQuestion(text, profile, savedCredits = {}, lastTopic = 'overview') {
  const out = { sections: [], sources: [], followups: [], topic: lastTopic, needsProfile: false };
  const q = text.trim();
  const unmatchedYear = q.match(/(?<!\d)((?:19|20)\d{2})\s*(?:학번|학년도|년\s*입학)/);
  if (unmatchedYear && (Number(unmatchedYear[1]) < 2000 || Number(unmatchedYear[1]) > 2026)) {
    out.sections.push(section('해당 입학 연도는 아직 확인이 필요해요.', '<p>현재는 2000~2026학년도 입학자를 구분한 2026학년도 공개 기준표를 안내합니다. 미래 학년도나 그 이전 기준은 확정해 답하지 않아요.</p>'));
    out.sources = ['notices', 'office']; return out;
  }
  if (/기계시스템|스마트모빌리티|전자공학|컴퓨터공학/.test(q)) {
    out.sections.push(section('기계공학전공 기준을 안내하고 있어요.', '<p>기계시스템공학전공·스마트모빌리티전공 등은 별도 전공이므로 이 챗봇의 학점 기준을 적용할 수 없어요. 해당 전공의 교육과정과 사무실에 확인해 주세요.</p>'));
    out.sources = ['notices']; return out;
  }
  if (/안녕|반가워|고마워|감사/.test(q) && q.length < 18) {
    out.sections.push(section('안녕하세요, 졸업 길잡이예요.', '<p>입학 연도별 졸업학점, 교양·MSC, 전공 필수과목과 졸업 전 준비사항을 공식 자료와 함께 안내해요.</p>'));
    out.followups = ['내 졸업요건을 알려줘', '졸업논문 제출은 언제야']; return out;
  }
  const workbookAnswer = answerWorkbook(q, profile);
  if (workbookAnswer) return workbookAnswer;
  const topics = findTopics(q, lastTopic);
  if (!topics.length) {
    out.sections.push(section('이 질문은 확인한 자료만으로 답하기 어려워요.', '<p>이 시범 챗봇은 졸업요건 질문 유형과 확인된 규정에 따라 안내합니다. 과목별 인정, 재수강 대체, 평점, 성적 판정처럼 개인 자료가 필요한 내용은 사무실에서 확인해 주세요.</p>'));
    out.sources = ['office']; out.followups = ['졸업요건을 정리해줘', '공식 자료를 보여줘']; return out;
  }
  out.topic = topics[0];
  const rules = getRules(profile);
  const needsYear = topics.some(topic => ['overview', 'major', 'liberal', 'msc', 'certification', 'service', 'progress', 'design'].includes(topic));
  if (needsYear && !rules) {
    out.sections.push(section('먼저 입학 연도를 알려주세요.', '<p>예를 들어 <strong>“2022학번 비인증과정이야”</strong>라고 입력하거나, ‘나에게 맞는 안내’에서 정보를 선택해 주세요. 편입·전과·재입학 여부도 함께 확인해요.</p>'));
    out.needsProfile = true; return out;
  }
  if (needsYear && profile.admission !== 'regular') {
    const returning = profile.admission === 'returnfirst';
    out.sections.push(section('학적 변동에 따른 적용 기준을 먼저 확인해요.', `<p>${returning ? '2024학년도 이전 입학자가 2025학년도 이후 1학년 1학기에 복학·재입학하면 교양은 2025학년도 이후 기준을 적용한다는 예외가 있습니다(2026 교육과정 4쪽).' : '편입·전과·재입학·다전공은 인정학점과 적용 교육과정이 달라 일반 신입학 숫자로 자동 판정하지 않아요.'}</p><p>전공 사무실에 <strong>입학 연도, 학적 변경 시기, 인정과목 내역, 공학교육인증 여부</strong>를 확인해 주세요. 논문·제출 공지는 PDF 자료실의 공식 참고자료에서 볼 수 있어요.</p>`));
    out.sources = ['curriculum2026', 'guidance2026', 'office']; return out;
  }
  if (needsYear) out.sections.push(section('', `<p><strong>${profileLabel(profile)}</strong><br>2026학년도 공개 교육과정 기준으로 안내해요.</p>`));
  for (const topic of topics) {
    switch (topic) {
      case 'overview': {
        const msc = rules.msc === null ? `인증 ${rules.mscCertified} / 비인증 ${rules.mscNoncertified}` : rules.msc;
        out.sections.push(section('졸업학점의 기본 틀', table(['항목', '2026 기준표'], [['총 졸업학점', `${rules.total}학점`], ['전공 (필수·설계 포함)', `${rules.major}학점`], ['교양 (MSC 제외)', `${rules.liberal}학점 · 기초 ${rules.liberalCommon} + 선택 ${rules.liberalElective}`], ['MSC · 학문기초', `${msc}학점`]]) + '<p>각 영역의 학점과 필수과목을 따로 충족해야 해요. 졸업논문·학습성과·상담 등도 함께 점검하세요.</p>' + note('2025 자료의 전공 72학점과 2026 자료의 71학점은 다릅니다(2014 이전 입학자는 65학점). 개인에게 적용되는 개편·경과조치는 수강지도 자료와 사무실에서 확인하세요.')));
        out.sources.push('curriculum2026', 'guidance2026');
        out.followups.push('전공 필수과목을 알려줘', '교양 기준을 자세히 알려줘', '남은 학점을 계산하고 싶어');
        break;
      }
      case 'major': {
        const elective = /전공\s*선택|전선/.test(q);
        let html = `<p>2026 기준표의 전공 합계는 <strong>${rules.major}학점</strong>이에요. 전공필수와 전공선택을 나누어 기록하고 합계도 확인하세요.</p>`;
        html += `<p>${rules.newer ? '2025학년도 이후 기준표는 기본전공 32학점 + 전공추가이수 선택 경로 39학점입니다.' : '이전 입학자의 필수·선택 각각의 최소학점은 업로드 기준표에 따로 적혀 있지 않아 임의로 적용하지 않아요.'}</p>`;
        html += majorCourseTable(elective);
        html += note('목록은 현행 편성표입니다. 과거 입학자의 필수과목, 동일·대체 인정은 개별 확인이 필요해요. 전공선택 목록 전체를 이수해야 한다는 뜻은 아닙니다.');
        out.sections.push(section(elective ? '전공선택 과목' : '전공필수 과목', html));
        out.sources.push('workbookCourses','workbookGraduation','curriculum2026');
        out.followups.push(elective ? '전공필수 과목도 알려줘' : '전공선택 과목도 알려줘', '다음 학기 수강 추천');
        break;
      }
      case 'liberal': {
        let html = rules.newer ? '<p>기초교양 8학점 + 학문기초(MSC) + 선택교양 19학점이에요. MSC를 합한 교양 전체는 인증 56학점, 비인증 44학점입니다.</p><p>기초교양은 글쓰기와발표, 글로벌커뮤니케이션, 디지털문해력입니다. 균형교양 3개 영역에서 각 1과목 이상을 이수해야 해요. 2025학년도 이후에는 사회봉사1도 확인하세요.</p>' : '<p>2026 전공 기준표는 기초교양 4학점 + 선택교양 16학점 + MSC로 안내합니다. MSC를 제외한 교양은 20학점, 포함하면 인증 52학점·비인증 40학점입니다.</p><p>전공별 설명(19쪽)은 2024학년도 이전 입학자에게 균형교양 영역별 필수 이수가 없다고 안내합니다. 이전 자료의 교양심화 기준과 다르므로 개편 적용 여부를 확인하세요.</p>';
        html += note('이수구분 변경·대체과목과 교양 세부영역은 총학점 계산만으로 확인할 수 없어요. 특히 이전 입학자는 2026-2 수강지도 첨부자료를 함께 확인하세요.');
        out.sections.push(section('교양은 세부 구성을 함께 확인해요.', html));
        out.sources.push('curriculum2026', 'guidance2026');
        break;
      }
      case 'msc':
        out.sections.push(section('MSC · 학문기초 기준', table(['구분', '필요 학점'], [['인증과정', `${rules.mscCertified}학점`], ['비인증과정', `${rules.mscNoncertified}학점`]]) + `<p>${rules.newer ? '2025학년도 이후에는 학문기초가 교양에 포함됩니다.' : '이전 입학자의 MSC에는 디지털문해력의 이수구분도 확인해야 합니다.'} 수학·기초과학·컴퓨터 관련 지정과목이 있으므로 과목 구성도 함께 확인하세요.</p>` + note('인증 여부가 미확인이면 둘 중 하나를 임의로 적용하지 않아요. 개인의 인증 이수 상태는 전공 사무실에서 확인할 수 있어요.')));
        out.sources.push('curriculum2026', 'office');
        break;
      case 'certification':
        out.sections.push(section('인증 여부에 따라 확인할 항목이 달라요.', `<p>선택한 입학 연도에서 MSC 기준은 <strong>인증 ${rules.mscCertified}학점 / 비인증 ${rules.mscNoncertified}학점</strong>입니다. 설계 교과목과 학습성과 등 인증과정의 추가 기준도 확인해야 해요.</p><p>인증 포기·변경 가능 여부나 시점은 여기서 결정할 수 없어요. 본인의 과정과 해당 연도 절차를 사무실에 확인해 주세요.</p>`));
        out.sources.push('curriculum2026', 'office');
        break;
      case 'design':
        out.sections.push(section('설계·캡스톤은 과목별로 확인해요.', '<p>2026 편성표에 창의설계입문, 기계공학과제1·2(캡스톤디자인), 기계공학창의종합설계가 전공필수로 포함됩니다. 전체 과목학점과 인정 설계학점은 같지 않을 수 있어요.</p>' + (profile.certification === 'noncertified' ? '<p>선택한 과정은 비인증이므로 인증 안내서의 설계 최소학점을 자동 적용하지 않아요. 필수과목·대체 인정 여부는 개인별 교육과정으로 확인해 주세요.</p>' : '<p><strong>인증과정</strong>은 2026 인증 안내서 23쪽의 최소달성기준에서 <strong>설계 12학점</strong>과 졸업설계 구두발표·보고서 심사 통과를 요구합니다. 과목별 설계학점과 선수과목은 원문을 함께 확인해 주세요.</p>') + note('설계과목 이수 순서와 개인별 인정내역이 필요하므로 이 시범 버전은 설계학점을 자동 판정하지 않아요.')));
        out.sources.push('curriculum2026', 'certification2026', 'office');
        break;
      case 'service':
        out.sections.push(section('사회봉사1 이수 여부', `<p>2026 교육과정 16쪽은 <strong>2025학년도 이후 입학자의 사회봉사1 이수</strong>를 졸업요건으로 안내합니다. 2024학년도 이전 입학자는 사회봉사 과목을 선택할 수 있다고 설명합니다.</p><p>${rules.newer ? '선택한 입학 연도에는 사회봉사1 이수 여부를 확인해 주세요.' : '선택한 입학 연도는 해당 표의 2024학년도 이전 그룹이에요.'} 활동 시간·인정 절차·예외는 해당 과목 안내에서 확인하세요.</p>`));
        out.sources.push('curriculum2026');
        break;
      case 'finish':
        out.sections.push(section('졸업논문과 학습성과 제출', '<p><strong>2026-2학기 논문 공지</strong>는 기계공학전공 7·8학기 재학생 및 수료생을 대상으로 합니다. 심사는 2026.11.16.~12.4., 완성본 제출은 2026.12.7.까지로 안내되어 있어요.</p><p><strong>2027년 2월 졸업예정자 학습성과 공지</strong>는 기본소양 에세이와 출구면접 설문을 2026.11.16.~12.4. 정기상담 기간에 지도교수에게 제출하도록 안내합니다.</p>' + note('위 일정은 특정 학기·졸업예정자에게만 적용돼요. 본인의 졸업학기에는 최신 공지의 대상자·서식·제출 경로를 다시 확인하세요.')));
        out.sources.push('thesis', 'outcomes', 'notices');
        break;
      case 'english':
        out.sections.push(section('영어 교과목과 외국어 졸업기준을 구분해요.', '<p>기초교양의 영어 관련 교과목과 공인어학성적을 이용한 졸업기준은 서로 다릅니다. 인증 안내서 23쪽에는 공인어학성적이 학습성과 평가도구로 기재되어 있지만, 모든 학생에게 적용되는 TOEIC 점수나 면제 기준까지 확인하지는 못했어요.</p><p>입학 연도·인증과정에 따른 외국어 기준과 대체 인정 여부를 사무실에 확인해 주세요. 확인되지 않은 점수를 졸업요건으로 제시하지 않아요.</p>'));
        out.sources.push('curriculum2026', 'certification2026', 'office');
        break;
      case 'counseling':
        out.sections.push(section('상담 이수 기록도 함께 확인하세요.', '<p>2026 편성표에 지도교수상담(FP0001)이 기재되어 있습니다.</p>' + (profile.certification === 'noncertified' ? '<p>비인증과정의 개인별 상담 기준은 사무실에 확인해 주세요. 인증과정 안내서의 최소기준을 비인증 학생에게 일괄 적용하지 않아요.</p>' : '<p><strong>인증과정</strong>의 2026 안내서 23쪽은 프로그램 진입부터 졸업까지 수강신청 가능한 학기 수만큼 상담하고, 그 수의 절반 이상 지도교수상담 과목을 이수하도록 안내합니다.</p>') + '<p>실제 적용 학기 수와 인정내역은 지도교수·사무실에서 확인해 주세요. 2027년 2월 졸업예정자는 정기상담 기간에 학습성과 자료를 제출합니다.</p>'));
        out.sources.push('curriculum2026', 'certification2026', 'outcomes', 'office');
        break;
      case 'progress': {
        const inline = readInlineCredits(q);
        const credits = Object.keys(inline).length ? inline : savedCredits;
        const result = calculateCredits(profile, credits);
        let html = '<p>‘나의 이수현황’에서 총학점·전공필수·전공선택·교양·MSC를 입력하면 영역별 부족 학점을 볼 수 있어요. 아직 모르는 항목은 비워 두세요.</p><p><a class="text-button" href="#progress">이수현황 입력하러 가기 →</a></p>';
        if (result.ok) html = table(['항목', '입력 / 기준', '부족 학점'], result.rows.map(row => [row.label, `${row.value ?? '미입력'} / ${row.required ?? '미확인'}`, row.remaining === null ? '확인 필요' : row.remaining + '학점'])) + (Object.keys(inline).length ? '<p>이번 질문의 숫자로 계산했어요. 교양 입력은 MSC를 제외한 학점으로 해석합니다. 이 값은 이수현황에 자동 저장하지 않아요.</p>' : '<p>이수현황에 저장한 학점으로 계산했어요.</p>');
        else if (Object.keys(credits).length) html = `<p>${result.error}</p><p><a class="text-button" href="#progress">이수현황에서 확인하기 →</a></p>`;
        html += note('학점 수를 충족해도 졸업 가능이 확정되지는 않습니다. 필수과목, 세부영역, 논문·학습성과, 개인별 적용 기준은 별도 확인이 필요해요.');
        out.sections.push(section('입력한 학점으로 참고 계산해요.', html));
        out.sources.push('curriculum2026', 'guidance2026');
        break;
      }
      case 'sources':
        out.sections.push(section('정리한 PDF를 바로 내려받으세요.', '<p>업로드한 엑셀을 졸업요건·비교과, 교과목 편성, 융합전공의 세 가지 PDF로 정리했어요. 자료실에서 바로 열고 내려받을 수 있습니다. 보완에 사용한 공식 자료도 함께 확인할 수 있어요.</p><p><a class="text-button" href="#sources">PDF 자료실 열기 →</a></p>'));
        out.sources.push('workbookGraduation', 'workbookCourses', 'workbookPrograms');
        break;
      case 'office':
        out.sections.push(section('기계공학전공 사무실', '<p><strong>054-478-7290, 7304</strong><br>국립금오공과대학교 테크노관 105호</p><p>문의할 때 입학 연도, 인증과정, 학적 변동 여부, 확인할 과목의 이수구분을 함께 준비하면 도움이 됩니다.</p>'));
        out.sources.push('office', 'notices');
        break;
    }
  }
  if (!out.followups.length) out.followups = ['졸업요건 전체 보기', '공식 자료를 보여줘'];
  return out;
}
