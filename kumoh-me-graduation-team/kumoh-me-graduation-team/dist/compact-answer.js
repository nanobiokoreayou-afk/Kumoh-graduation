// Keep each conversational page short; long tables and lists are paginated.
export function compactPages(sections){
 const pages=[];let html='',weight=0;
 const flush=()=>{if(html){pages.push(html);html='';weight=0;}};
 const append=(content,cost)=>{if(weight+cost>370&&html)flush();html+=content;weight+=cost;};
 for(const section of sections){
  const source=document.createElement('div');source.innerHTML=section.html;
  const title=section.title?document.createElement('h3'):null;if(title)title.textContent=section.title;
  const atoms=[];
  for(const node of source.children){
   if(node.tagName==='TABLE'){
    const rows=[...node.querySelectorAll('tbody tr')];
    for(let i=0;i<rows.length;i+=4){const t=node.cloneNode(true);t.querySelector('tbody').replaceChildren(...rows.slice(i,i+4).map(r=>r.cloneNode(true)));atoms.push({html:t.outerHTML,weight:60+rows.slice(i,i+4).length*52});}
   }else if(['UL','OL'].includes(node.tagName)&&node.children.length>3){
    for(let i=0;i<node.children.length;i+=3){const list=node.cloneNode(false);list.append(...[...node.children].slice(i,i+3).map(r=>r.cloneNode(true)));atoms.push({html:list.outerHTML,weight:Math.max(130,list.textContent.length)});}
   }else atoms.push({html:node.outerHTML,weight:Math.max(40,node.textContent.length)});
  }
  if(title){if(weight>170)flush();append(title.outerHTML,40);}
  for(const atom of atoms)append(atom.html,atom.weight);
 }
 flush();return pages.length?pages:['<p>확인할 내용을 선택해 주세요.</p>'];
}
export function attachCompactPagination(element,pages){
 let current=0;const body=element.querySelector('.message-bubble');const pager=element.querySelector('.answer-pager');
 const draw=()=>{body.innerHTML=pages[current];if(!pager)return;pager.hidden=pages.length<2;pager.innerHTML=`<button type="button" data-page-step="-1" ${current===0?'disabled':''}>이전</button><span>${current+1} / ${pages.length}</span><button type="button" data-page-step="1" ${current===pages.length-1?'disabled':''}>다음 내용 →</button>`;};
 if(pager)pager.addEventListener('click',event=>{const b=event.target.closest('[data-page-step]');if(!b)return;current=Math.max(0,Math.min(pages.length-1,current+Number(b.dataset.pageStep)));draw();});draw();
}
