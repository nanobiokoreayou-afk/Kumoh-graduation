import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../dist/data/catalog.js';
import {REQUIRED_COURSES,ELECTIVE_COURSES,recommendCourses} from '../dist/recommendations.js';
const p={year:2025,admission:'regular',certification:'certified'};
const options={year:2027,semester:1,grade:3,budget:18,interest:'all',confirmed:true};
test('catalog deduplicates source codes and keeps unknown fusion fields unknown',()=>{
  assert.equal(catalog.courses.length,130);
  assert.equal(new Set(catalog.courses.map(c=>c.code)).size,130);
  assert.equal(REQUIRED_COURSES.length,13);
  assert.equal(REQUIRED_COURSES.reduce((sum,c)=>sum+c.credits,0),32);
  assert.equal(ELECTIVE_COURSES.length,23);
  assert.equal(catalog.programCourses.filter(c=>c.program==='SSU').length,121);
  assert.equal(catalog.programCourses.filter(c=>c.program==='AIRO').length,51);
  assert(catalog.programCourses.every(c=>c.credits===null&&c.semesters.length===0));
});
test('no default term or unconfirmed completion history can create a plan',()=>{
  for(const override of [{year:''},{semester:''},{grade:''},{confirmed:false},{budget:21}]) assert.equal(recommendCourses(p,[],{...options,...override}).ok,false);
  assert.equal(recommendCourses({...p,admission:'transfer'},[],options).ok,false);
});
test('missing required courses are prioritized, completed courses excluded, and term and budget respected',()=>{
  const plan=recommendCourses(p,['CA1005'],options);
  assert.equal(plan.ok,true);
  assert(plan.credits<=18);
  assert(!plan.selected.some(c=>c.code==='CA1005'));
  assert(plan.selected.every(c=>c.semesters.includes(1)&&c.year<=3));
  assert(plan.deferred.some(c=>c.code==='CA1008'));
  assert(plan.selected[0].category==='전공필수'&&plan.selected[0].year<3);
  const electiveIndex=plan.selected.findIndex(c=>c.category==='전공선택');
  assert(electiveIndex>0);
  assert(plan.selected.slice(electiveIndex).every(c=>c.category==='전공선택'));
});
test('unmet known prerequisites block selection until prerequisite is recorded',()=>{
  const o={...options,semester:2,grade:2};
  const a=recommendCourses(p,[],o);
  assert(a.blocked.some(c=>c.code==='CA1020'));
  assert(!a.selected.some(c=>c.code==='CA1020'));
  const b=recommendCourses(p,['CA1002'],o);
  assert(b.selected.some(c=>c.code==='CA1020'));
});
test('SSU interest suggests eligible mechanical equivalents and never invents fusion course offerings',()=>{
  const plan=recommendCourses(p,REQUIRED_COURSES.map(c=>c.code),{...options,grade:4,interest:'ssu'});
  assert(plan.selected[0].ssu);
  assert([...plan.selected,...plan.alternatives].every(c=>c.code.startsWith('CA')));
  assert(plan.completedEquivalentCodes.includes('SK0086'));
});
