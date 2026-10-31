import {findCourse,CATEGORIES,sanitizeRow} from './academic.js';

export function parseTranscriptText(text){
 const lines=String(text).normalize('NFKC').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const compact=lines.join('\n').replace(/[ \t]/g,'');
 const entry=compact.match(/입학일[:：]?(20\d{2})년/);
 const total=compact.match(/총취득학점[:：]?(\d{1,3}(?:\.\d)?)/);
 const gpa=compact.match(/총평점평균[:：]?(\d\.\d{1,2})/);
 const rows=[],warnings=[];let term='학기 미확인',year=null,semester=null,lastRegularGpa=null;
 for(let raw of lines){
  const line=raw.replace(/([교전기])\s+([필선])/g,'$1$2').replace(/([ABCD])\s*\+/g,'$1+');
  const packed=line.replace(/\s+/g,'');
  const heading=packed.match(/(20\d{2})학년도(?:제)?([12])학기/);
  const seasonal=packed.match(/(20\d{2})학년도(여름|겨울)(?:계절)?/);
  if(heading){year=Number(heading[1]);semester=Number(heading[2]);term=`${year}-${semester}`;continue;}
  if(seasonal){year=Number(seasonal[1]);semester=seasonal[2]==='여름'?'summer':'winter';term=`${year} ${seasonal[2]}계절`;continue;}
  const termGpa=packed.match(/(?<!총)평점평균[:：]?(\d\.\d{1,2})/);
  if(termGpa&&[1,2].includes(semester))lastRegularGpa=Number(termGpa[1]);
  // Transcript rows are data; arbitrary PDF text is never executed or rendered as HTML.
  const category=line.match(/^(교필|교선|전필|전선|기필|기선|융합|일선|일반선택)\s*(.+)$/);
  if(!category)continue;
  let body=category[2].trim();
  let match=body.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s+([ABCD](?:\+|0|O)?|F|S|P|U|NP)\s*$/i);
  if(!match&&/지도교수상담/.test(body)){
   const advising=body.match(/^(.+?)\s+([SP])\s*$/i);if(advising)match=[body,advising[1],'0',advising[2]];
  }
  if(!match){warnings.push('일부 행의 학점·성적을 읽지 못했어요. 확인 화면에서 수정해 주세요.');rows.push(sanitizeRow({name:body.replace(/\s+/g,''),category:category[1],credits:null,grade:'미확인',term,year,semester},rows.length));continue;}
  const name=match[1].replace(/^[.·_'\s]+/,'').replace(/\s+/g,'');const credits=Number(match[2]);
  const codeMatch=name.match(/\b([A-Z]{2}\d{4})\b/);const c=findCourse(codeMatch?.[1]||name);
  const grade=match[3].toUpperCase().replace(/0|O/g,'');
  rows.push(sanitizeRow({name,code:c?.code||'',category:category[1]==='일반선택'?'일선':category[1],credits,grade,term,year,semester},rows.length));
 }
 return {rows,entryYear:entry?Number(entry[1]):null,declaredTotal:total?Number(total[1]):null,gpa:gpa?Number(gpa[1]):null,lastRegularGpa,program:/SSU반도체융합전공/i.test(compact)?'ssu':null,warnings:[...new Set(warnings)],method:'text'};
}
function textItemsToLines(items){
 const filtered=items.filter(x=>x.str?.trim()).map(x=>({text:x.str,x:x.transform[4],y:x.transform[5]}));
 const anchors=filtered.filter(x=>x.text.replace(/\s/g,'').includes('교과목명'));
 let groups=[filtered];
 if(anchors.length>=2){
  const xs=[...new Set(anchors.map(x=>Math.round(x.x)))].sort((a,b)=>a-b);
  if(xs.length>=2){const delta=xs[1]-xs[0];groups=xs.map(x=>filtered.filter(p=>p.x>=x-65&&p.x<x+delta-65));}
 }
 return groups.map(group=>{
  const rows=[];
  for(const item of group.sort((a,b)=>b.y-a.y||a.x-b.x)){
   let row=rows.find(r=>Math.abs(r.y-item.y)<2.2);if(!row){row={y:item.y,items:[]};rows.push(row);}row.items.push(item);
  }
  return rows.sort((a,b)=>b.y-a.y).map(r=>r.items.sort((a,b)=>a.x-b.x).map(x=>x.text).join(' ')).join('\n');
 }).join('\n');
}
let ocrLoader;
function loadOCR(){
 if(globalThis.Tesseract)return Promise.resolve(globalThis.Tesseract);
 if(!ocrLoader)ocrLoader=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=new URL('./vendor/tesseract/tesseract.min.js',import.meta.url).href;s.onload=()=>resolve(globalThis.Tesseract);s.onerror=()=>{ocrLoader=null;reject(new Error('문자 인식 도구를 불러오지 못했어요. 다시 시도하거나 학기별로 입력해 주세요.'));};document.head.append(s);});
 return ocrLoader;
}
function ocrLines(tsv){
 const map=new Map();
 for(const line of String(tsv||'').split('\n').slice(1)){
  const p=line.split('\t');if(p[0]!=='5'||!p[11]?.trim())continue;
  const key=p.slice(1,5).join('-');if(!map.has(key))map.set(key,{y:Number(p[7]),h:Number(p[9]),words:[]});
  const row=map.get(key);row.h=Math.max(row.y+row.h,Number(p[7])+Number(p[9]))-Math.min(row.y,Number(p[7]));row.y=Math.min(row.y,Number(p[7]));
  row.words.push({text:p.slice(11).join('\t').trim(),x:Number(p[6]),y:Number(p[7]),w:Number(p[8])});
 }
 return [...map.values()].sort((a,b)=>a.y-b.y);
}
async function mergeOCR(korean,crop,numberWorker,cancelled){
 const output=[];
 const ctxAll=crop.getContext('2d'),pix=ctxAll.getImageData(0,0,crop.width,crop.height).data,segments=[];
 let top=null,last=null;
 for(let y=0;y<crop.height;y++){
  let ink=0;for(let x=Math.floor(crop.width*.78);x<crop.width*.995;x++)if(pix[(y*crop.width+x)*4]<100)ink++;
  if(ink>2){if(top===null)top=y;last=y;}
  else if(top!==null&&y-last>2){if(last-top>4)segments.push({top,bottom:last,center:(top+last)/2});top=null;}
 }
 if(top!==null)segments.push({top,bottom:last,center:(top+last)/2});
 for(const line of ocrLines(korean.tsv)){
  const raw=line.words.map(w=>w.text).join(' ').replace(/^기밀\b/,'기필').replace(/^기밀\s/,'기필 ');
  if(!/^(교|전|기)\s*[필선]/.test(raw)){output.push(raw);continue;}
  cancelled();
  const name=line.words.filter(w=>w.x<crop.width*.77).map(w=>w.text).join(' ').replace(/^기밀\s/,'기필 ');
  const near=segments.slice().sort((a,b)=>Math.abs(a.center-line.y-line.h/2)-Math.abs(b.center-line.y-line.h/2))[0];
  if(!near||Math.abs(near.center-line.y-line.h/2)>24){output.push(name);continue;}
  const rowHeight=near.bottom-near.top+1;
  const strip=document.createElement('canvas');strip.width=Math.round(crop.width*.23)+24;strip.height=rowHeight+20;
  const ctx=strip.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,strip.width,strip.height);
  ctx.drawImage(crop,crop.width*.77,near.top,crop.width*.23,rowHeight,12,10,strip.width-24,rowHeight);
  const num=await numberWorker.recognize(strip,{}, {text:true});strip.width=0;strip.height=0;
  const val=num.data.text.replace(/\s/g,'').replace(/(\d)\.(?=[ABCD])/g,'$1');
  const m=val.match(/^(\d(?:\.\d)?)([ABCD][+0]?|F|S|P|U|NP)$/);
  if(m)output.push(`${name} ${m[1]} ${m[2]}`);
  else if(/지도교수상담/.test(name.replace(/\s/g,''))&&/^[SP]$/.test(val))output.push(`${name} 0 ${val}`);
  else output.push(name);
 }
 return output.join('\n');
}
export async function readTranscript(file,{onProgress=()=>{},signal}={}){
 if(!file||file.size>20*1024*1024)throw new Error('20MB 이하 PDF를 선택해 주세요.');
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw new Error('PDF 형식의 성적표를 선택해 주세요.');
 const pdfjs=await import('./vendor/pdfjs/pdf.mjs');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
 let documentTask,doc,worker,numberWorker;
 const cancelled=()=>{if(signal?.aborted)throw new DOMException('취소됨','AbortError');};
 const abort=()=>{worker?.terminate().catch(()=>{});numberWorker?.terminate().catch(()=>{});documentTask?.destroy();};
 signal?.addEventListener('abort',abort,{once:true});
 try{
  cancelled();documentTask=pdfjs.getDocument({data:bytes,isEvalSupported:false,stopAtErrors:true,useSystemFonts:true});
  doc=await documentTask.promise;
  if(doc.numPages>8)throw new Error('8쪽 이하 성적표를 선택해 주세요. 긴 파일은 학기별 입력을 이용할 수 있어요.');
  let content='',ocrUsed=false;
  for(let pageNo=1;pageNo<=doc.numPages;pageNo++){
   cancelled();onProgress(`${pageNo}/${doc.numPages}쪽 읽는 중`,Math.round((pageNo-1)/doc.numPages*100));
   const page=await doc.getPage(pageNo),text=await page.getTextContent();const candidate=textItemsToLines(text.items);
   if(candidate.replace(/\s/g,'').length>120){content+='\n'+candidate;continue;}
   ocrUsed=true;
   if(!worker){
    onProgress('이미지 PDF의 글자를 읽을 준비를 하고 있어요.',0);
    const Tesseract=await loadOCR();cancelled();
    const config={workerPath:new URL('./vendor/tesseract/worker.min.js',import.meta.url).href,corePath:new URL('./vendor/tesseract/',import.meta.url).href,langPath:new URL('./vendor/tessdata/',import.meta.url).href,gzip:false,workerBlobURL:false,cacheMethod:'none'};
    worker=await Tesseract.createWorker('kor',1,config);
    numberWorker=await Tesseract.createWorker('eng',1,config);
    await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'});
    await numberWorker.setParameters({tessedit_pageseg_mode:'7',tessedit_char_whitelist:'0123456789ABCD+FSPUN.'});
   }
   const viewport=page.getViewport({scale:4}),canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
   await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   // KIT's scanned certificate has three vertical course columns. Keep them in
   // reading order, so a semester continuing in the next column is preserved.
   const regions=[{x:.07,y:.213,w:.285,h:.563},{x:.357,y:.213,w:.286,h:.563},{x:.646,y:.213,w:.285,h:.563}];
   for(let i=0;i<regions.length;i++){
    cancelled();const r=regions[i],crop=document.createElement('canvas');crop.width=Math.round(canvas.width*r.w);crop.height=Math.round(canvas.height*r.h);
    crop.getContext('2d').drawImage(canvas,canvas.width*r.x,canvas.height*r.y,canvas.width*r.w,canvas.height*r.h,0,0,crop.width,crop.height);
    const ctx=crop.getContext('2d'),pixels=ctx.getImageData(0,0,crop.width,crop.height);
    for(let p=0;p<pixels.data.length;p+=4){const v=(pixels.data[p]+pixels.data[p+1]+pixels.data[p+2])/3>170?255:0;pixels.data[p]=pixels.data[p+1]=pixels.data[p+2]=v;}ctx.putImageData(pixels,0,0);
    onProgress(`${pageNo}쪽 ${i+1}/3열 문자 인식 중`,0);
    const result=await worker.recognize(crop,{}, {text:true,tsv:true});
    content+='\n'+await mergeOCR(result.data,crop,numberWorker,cancelled);crop.width=0;crop.height=0;
   }
   canvas.width=0;canvas.height=0;page.cleanup();
  }
  cancelled();const parsed=parseTranscriptText(content);content='';parsed.method=ocrUsed?'ocr':'text';
  if(parsed.rows.length===0)throw new Error('과목을 읽지 못했어요. 이미지 성적표는 금오공대 3열 양식 기준으로 읽습니다. 학기별 입력으로 이어갈 수 있어요.');
  onProgress('읽기 완료 · 원본과 비교해 확인해 주세요.',100);return parsed;
 } catch(error){
  if(signal?.aborted)throw new DOMException('취소됨','AbortError');
  if(error.name==='PasswordException')throw new Error('암호가 있는 PDF예요. 암호를 해제한 사본을 선택하거나 학기별로 입력해 주세요.');
  throw error;
 } finally{signal?.removeEventListener('abort',abort);if(worker)await worker.terminate().catch(()=>{});if(numberWorker)await numberWorker.terminate().catch(()=>{});if(documentTask)await documentTask.destroy().catch(()=>{});}
}
