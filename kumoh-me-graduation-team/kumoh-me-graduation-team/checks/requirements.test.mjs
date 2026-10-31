import test from 'node:test';
import assert from 'node:assert/strict';
import { getRules, calculateCredits, validateCredits, profileFromText, answerQuestion, SOURCES } from '../dist/knowledge.js';
const p = (year = 2022, certification = 'noncertified', admission = 'regular') => ({ year, certification, admission });
test('2026 official table uses 71 credits for recent cohorts and 65 through 2014', () => {
  for (const year of [2015, 2016, 2017, 2024, 2025, 2026]) assert.equal(getRules(p(year)).major, 71);
  assert.equal(getRules(p(2014)).major, 65);
  assert.equal(getRules(p(2000)).major, 65);
  assert.equal(getRules(p(2027)), null);
  assert.equal(getRules(p('')), null);
});
test('2025 transition and certification select the correct MSC, without duplicate liberal credits', () => {
  for (const [year, cert, liberal, msc] of [[2024, 'certified', 20, 32], [2024, 'noncertified', 20, 20], [2025, 'certified', 27, 29], [2025, 'noncertified', 27, 17]]) {
    const rules = getRules(p(year, cert));
    assert.equal(rules.liberal, liberal);
    assert.equal(rules.msc, msc);
  }
});
test('unknown and missing values are not treated as completed or zero', () => {
  const result = calculateCredits(p(2025, 'unknown'), { total: 100, msc: 29 });
  assert.equal(result.ok, true);
  assert.equal(result.rows[0].remaining, 30);
  assert.equal(result.rows.find(r => r.id === 'major').remaining, null);
  assert.equal(result.rows.find(r => r.id === 'msc').remaining, null);
});
test('credit deficits cap at zero and individual student exceptions block automatic calculation', () => {
  const result = calculateCredits(p(), { total: 140, major: 75, liberal: 22, msc: 20 });
  assert(result.rows.filter(r => !['majorRequired','majorElective'].includes(r.id)).every(r => r.remaining === 0));
  for (const admission of ['transfer', 'changed', 'returnfirst']) assert.equal(calculateCredits(p(2022, 'certified', admission), { total: 130 }).ok, false);
});
test('reject contradictory credit totals, nonfinite numbers and invalid ranges', () => {
  assert(validateCredits(p(), { total: 100, major: 70, liberal: 20, msc: 20 }));
  for (const value of [-1, NaN, Infinity, 301, 3.2]) assert(validateCredits(p(), { total: value }));
  assert(validateCredits(p(), {}));
});
test('extract student cohort but not year mentioned as a graduation date or a full student ID', () => {
  assert.equal(profileFromText('22학번 비인증이야', p('')).profile.year, 2022);
  assert.equal(profileFromText('2025학번 인증과정이야', p()).profile.certification, 'certified');
  assert.equal(profileFromText('2027년 2월 졸업 논문 언제야', p()).changed, false);
  assert.equal(profileFromText('학번은 20221234', p('')).profile.year, '');
  assert.equal(profileFromText('인증과 비인증 차이', p(2022, 'certified')).profile.certification, 'certified');
  assert.equal(profileFromText('2022학번 편입생이야', p()).profile.admission, 'transfer');
});
test('ask for cohort before applying numeric requirements and preserve follow-up topic', () => {
  assert.equal(answerQuestion('전공 몇 학점 필요해', p('')).needsProfile, true);
  assert.equal(answerQuestion('그럼 비인증은?', p(), {}, 'msc').topic, 'msc');
  const a = answerQuestion('교양과 MSC, 전공을 알려줘', p());
  assert(a.sections.some(s => s.title.includes('전공')));
  assert(a.sections.some(s => s.title.includes('교양')));
  assert(a.sections.some(s => s.title.includes('MSC')));
});
test('do not invent English scores, generic unknown facts, or requirements for another department', () => {
  assert(!JSON.stringify(answerQuestion('토익 몇 점?', p())).includes('650'));
  assert(JSON.stringify(answerQuestion('수강 철회하면 평점이 어떻게 돼', p())).includes('답하기 어려워요'));
  assert(JSON.stringify(answerQuestion('기계시스템공학전공 졸업요건', p())).includes('별도 전공'));
  assert(JSON.stringify(answerQuestion('2027학번 졸업요건', p())).includes('아직 확인'));
});
test('all cited source IDs resolve to local PDFs or official university URLs', () => {
  for (const question of ['졸업요건', '전공', '교양', 'MSC', '공학교육인증', '캡스톤', '봉사', '논문', '영어', '지도교수', '남은 학점', '출처', '사무실']) {
    for (const id of answerQuestion(question, p()).sources) {
      assert(SOURCES[id], id);
      assert(SOURCES[id].url.startsWith('docs/') || new URL(SOURCES[id].url).hostname.endsWith('.kumoh.ac.kr'));
    }
  }
});
test('certification design and counseling minimums are not applied to the noncertified track', () => {
  assert(JSON.stringify(answerQuestion('설계학점', p(2022, 'certified'))).includes('설계 12학점'));
  assert(!JSON.stringify(answerQuestion('설계학점', p(2022, 'noncertified'))).includes('설계 12학점'));
  assert(JSON.stringify(answerQuestion('지도교수 상담', p(2022, 'certified'))).includes('절반 이상'));
  assert(!JSON.stringify(answerQuestion('지도교수 상담', p(2022, 'noncertified'))).includes('절반 이상'));
});

test('split major credits aggregate once and missing fields remain unknown', () => {
  const profile=p(2025);
  const r=calculateCredits(profile,{total:130,majorRequired:29,majorElective:42,liberal:27,msc:17});
  assert.equal(r.ok,true);
  assert.equal(r.rows.find(r=>r.id==='major').value,71);
  assert.equal(r.rows.find(r=>r.id==='majorRequired').remaining,3);
  assert.equal(r.rows.find(r=>r.id==='majorElective').remaining,0);
  assert.equal(calculateCredits(profile,{majorRequired:0}).rows.find(r=>r.id==='major').value,null);
  assert.equal(calculateCredits(profile,{majorRequired:0,majorElective:0}).rows.find(r=>r.id==='major').value,0);
  assert.equal(calculateCredits(p(2022),{majorRequired:32,majorElective:39}).rows.find(r=>r.id==='majorRequired').required,null);
  assert(validateCredits(profile,{total:70,majorRequired:32,majorElective:39}));
  assert(validateCredits(profile,{major:70,majorRequired:32,majorElective:39}));
  assert.equal(calculateCredits(profile,{major:60}).rows.find(r=>r.id==='major').value,60);
});
test('program questions do not silently change admission status',()=>{
  for (const q of ['복수전공 기준','부전공과 MD 차이','편입학 이수 기준이 뭐야','전과 신청은 어떻게 해']) assert.equal(profileFromText(q,p()).profile.admission,'regular');
  assert.equal(profileFromText('전과했어',p()).profile.admission,'changed');
});
test('workbook answers preserve non-obvious equivalences and unknowns',()=>{
  const ssu=JSON.stringify(answerQuestion('SK0086 알려줘',p()));
  assert(ssu.includes('CA1016'));
  assert(ssu.includes('미기재'));
  assert(!ssu.includes('3학점'));
  const elective=JSON.stringify(answerQuestion('응용열역학 정보',p()));
  assert(elective.includes('CA1029'));
  assert(!elective.includes('CA1005'));
  const career=JSON.stringify(answerQuestion('취업진로교육',p()));
  for(const word of ['8개','최대 3개','반복','2019']) assert(career.includes(word));
  const md=JSON.stringify(answerQuestion('마이크로디그리',p()));
  assert(md.includes('12학점'));
  assert(md.includes('5과목 전체가 필수라는 의미는 아니며'));
});
