"""Read-only XLSX extraction. Preserve source cells, missing fields and course identifiers."""
import json, re, hashlib, zipfile, xml.etree.ElementTree as E
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'data/source-workbook.xlsx'
NS={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
def read_xlsx(path):
    result=[]
    with zipfile.ZipFile(path) as z:
        strings=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            for item in E.fromstring(z.read('xl/sharedStrings.xml')).findall('s:si',NS):
                strings.append(''.join(t.text or '' for t in item.iter('{'+NS['s']+'}t')))
        rels={r.attrib['Id']:r.attrib['Target'] for r in E.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
        for s in E.fromstring(z.read('xl/workbook.xml')).findall('s:sheets/s:sheet',NS):
            target=rels[s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
            path=target.lstrip('/') if target.startswith('/') else 'xl/'+target
            rows=[]
            for row in E.fromstring(z.read(path)).findall('s:sheetData/s:row',NS):
                cells={}
                for c in row.findall('s:c',NS):
                    v=c.find('s:v',NS); value=v.text if v is not None else ''
                    if c.attrib.get('t')=='s':value=strings[int(value)] if value else ''
                    elif c.attrib.get('t')=='inlineStr':value=''.join(t.text or '' for t in c.findall('.//s:t',NS))
                    if value:cells[c.attrib['r']]=value
                if cells:rows.append(cells)
            result.append({'sheet':s.attrib['name'],'rows':rows})
    return result

def cols(row):return {re.sub(r'\d','',k):v for k,v in row.items()}
def num(value):
    try:return float(value) if '.' in value else int(value)
    except (ValueError,TypeError):return None

raw=read_xlsx(SOURCE)
courses={}; programs=[]; extra=[]
for sheet in raw:
    for row in sheet['rows']:
        c=cols(row); n=re.search(r'\d+',next(iter(row))).group()
        provenance={'sheet':sheet['sheet'],'range':f'A{n}:N{n}'}
        if sheet['sheet'] in ['필수 과목','선택 과목'] and re.fullmatch('[A-Z]{2}[0-9]{4}',c.get('B','')):
            code=c['B']
            if code in courses:
                courses[code]['sources'].append(provenance)
                courses[code]['alternateNotes'].append(c)
                continue
            courses[code]={
                'code':code,'name':c.get('C',''),'category':c.get('A',''),'year':num(c.get('D')),
                'semesters':sorted(set(map(int,re.findall('[12]',c.get('E',''))))),
                'credits':num(c.get('F')),'designCredits':num(c.get('G')),
                'certified':c.get('H',''),'noncertified':c.get('I',''),
                'ssu':c.get('J',''),'equivalents':c.get('K',''),'microdegree':c.get('L',''),
                'minorRequired':c.get('M',''),'linkedRecognition':c.get('N',''),
                'sources':[provenance],'alternateNotes':[],
            }
        elif sheet['sheet'] in ['SSU반도체융합전공과목','AI로봇 융합전공 과목'] and re.fullmatch('[A-Z]{2}[0-9]{4}',c.get('H','')):
            note=c.get('V',c.get('N',''))
            programs.append({'code':c['H'],'name':c['G'],'program':'SSU' if 'SSU' in sheet['sheet'] else 'AIRO',
              'year':None,'semesters':[],'credits':None,'note':note,
              'sameAs':re.findall(r'CA\d{4}',note) if '동일인정' in note else [],
              'required':True if '별도 이수요건상 필수' in note else None,
              'source':{'sheet':sheet['sheet'],'range':f'G{n}:V{n}' if 'SSU' in sheet['sheet'] else f'G{n}:N{n}'}})
        elif sheet['sheet']=='학적' and 23<=int(n)<=28:
            extra.append({'name':c['A'],'application':c.get('B',''),'requirement':c.get('C',''),'recognition':c.get('D',''),
              'award':c.get('E',''),'mechanical':c.get('F',''),'note':c.get('G',''),'source':f'학적!A{n}:G{n}'})

result={'source':{'fileName':'교과목 자료.xlsx','sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),'reviewed':'2026-10-30','authored':None,'sheets':[s['sheet'] for s in raw],
  'scope':'사용자 제공 자료. 실제 학기별 강좌 개설표가 아닌 교육과정 편성 정보.'},
  'courses':list(courses.values()),'programCourses':programs,'programs':extra,
  'warnings':['SSU·AI로봇 과목의 학기·학점은 원문 미기재','기초교양 과목별 필수 표기는 구학번에 일괄 적용하지 않음','사회봉사1 중복행은 과목코드로 통합','취업진로교육 A52 학기 표기와 과정명 불일치','MD 5개 후보 과목과 12학점 요건의 선택 규칙은 별도 확인']}
assert len(result['courses'])==130
assert len([c for c in result['courses'] if c['category']=='전공필수'])==13
assert len([c for c in result['courses'] if c['category']=='전공선택'])==23
assert sum(c['credits'] for c in result['courses'] if c['category']=='전공필수')==32
assert len(programs)==172
(ROOT/'dist/data').mkdir(parents=True,exist_ok=True)
(ROOT/'data/workbook-cells.json').write_text(json.dumps(raw,ensure_ascii=False,indent=2))
(ROOT/'dist/data/catalog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
(ROOT/'dist/data/catalog.js').write_text('export default '+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
print(json.dumps({'courses':len(courses),'programCourses':len(programs),'requiredMajorCredits':32,'sheetCount':len(raw)}))
