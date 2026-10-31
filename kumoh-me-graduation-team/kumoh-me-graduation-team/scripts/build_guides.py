import json, re, hashlib, io
from types import SimpleNamespace
from pathlib import Path
from xml.sax.saxutils import escape
from collections import defaultdict
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont as ReportLabFont
from fontTools.ttLib import TTFont
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.cu2quPen import Cu2QuPen
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
from pypdf import PdfReader, PdfWriter

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'output'/'pdf'
OUT.mkdir(parents=True, exist_ok=True)
RAW={s['sheet']:s['rows'] for s in json.load(open(ROOT/'data'/'workbook-cells.json'))}
HASH='f00fd0ef51cd3b7692c38a2101fc692a431c7e132960ae010f5ad83f413eee4a'
def make_embedded_font():
    target=ROOT/'data'/'NotoSansKR-Guide.ttf'
    if target.exists(): return target
    src=TTFont('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc',fontNumber=1)
    chars=set(Path(__file__).read_text()+Path(ROOT/'data'/'workbook-cells.json').read_text()+''.join(chr(i) for i in range(32,127)))
    cmap={ord(c):src.getBestCmap()[ord(c)] for c in chars if ord(c) in src.getBestCmap()}
    names=['.notdef']+sorted(set(cmap.values())-set(['.notdef']))
    gs=src.getGlyphSet();glyf={}
    for name in names:
        pen=TTGlyphPen(None);quad=Cu2QuPen(pen,max_err=1.0,reverse_direction=True)
        gs[name].draw(quad);glyf[name]=pen.glyph()
    fb=FontBuilder(src['head'].unitsPerEm,isTTF=True)
    fb.setupGlyphOrder(names);fb.setupCharacterMap(cmap);fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics({n:src['hmtx'].metrics[n] for n in names})
    fb.setupHorizontalHeader(ascent=src['hhea'].ascent,descent=src['hhea'].descent)
    fb.setupNameTable({'familyName':'Noto Sans KR Guide','styleName':'Regular','uniqueFontIdentifier':'NotoSansKRGuide2026','fullName':'Noto Sans KR Guide','psName':'NotoSansKRGuide'})
    fb.setupOS2(sTypoAscender=src['OS/2'].sTypoAscender,sTypoDescender=src['OS/2'].sTypoDescender,usWinAscent=src['OS/2'].usWinAscent,usWinDescent=src['OS/2'].usWinDescent)
    fb.setupPost();fb.setupMaxp();fb.save(target)
    return target
pdfmetrics.registerFont(ReportLabFont('NotoKR',str(make_embedded_font())))
F='NotoKR'
NAVY=colors.HexColor('#123D63'); BLUE=colors.HexColor('#007FB6'); CYAN=colors.HexColor('#00A7C7')
PALE=colors.HexColor('#EDF7FB'); LINE=colors.HexColor('#D9E5ED'); INK=colors.HexColor('#263E50'); MUTED=colors.HexColor('#61798B')
W=A4[0]-96
ST={
 'title':ParagraphStyle('title',fontName=F,fontSize=27,leading=36,textColor=NAVY,spaceAfter=13,wordWrap='CJK'),
 'sub':ParagraphStyle('sub',fontName=F,fontSize=11,leading=18,textColor=MUTED,spaceAfter=16,wordWrap='CJK'),
 'h1':ParagraphStyle('h1',fontName=F,fontSize=17,leading=24,textColor=NAVY,spaceBefore=14,spaceAfter=10,keepWithNext=True,wordWrap='CJK'),
 'h2':ParagraphStyle('h2',fontName=F,fontSize=12,leading=18,textColor=BLUE,spaceBefore=12,spaceAfter=7,keepWithNext=True,wordWrap='CJK'),
 'body':ParagraphStyle('body',fontName=F,fontSize=9.6,leading=16,textColor=INK,spaceAfter=8,wordWrap='CJK'),
 'small':ParagraphStyle('small',fontName=F,fontSize=8,leading=12,textColor=MUTED,spaceAfter=7,wordWrap='CJK'),
 'cell':ParagraphStyle('cell',fontName=F,fontSize=8.7,leading=12.7,textColor=INK,wordWrap='CJK'),
 'head':ParagraphStyle('head',fontName=F,fontSize=8.7,leading=13,textColor=colors.white,wordWrap='CJK'),
 'tiny':ParagraphStyle('tiny',fontName=F,fontSize=7.1,leading=10.5,textColor=MUTED,wordWrap='CJK'),
 'toc':ParagraphStyle('toc',fontName=F,fontSize=9,leading=17,textColor=BLUE,spaceAfter=12,wordWrap='CJK'),
}
def clean(t): return str(t).replace('—','-').replace('–','-').replace('\u2011','-').replace('\n',' / ')
def P(t,style='body',raw=False): return Paragraph(t if raw else escape(clean(t)),ST[style])
def source(t): return P('자료: 교과목 자료.xlsx / '+t,'small')
def note(t):
 t=Table([[P(t)]],colWidths=[W]);t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),PALE),('BOX',(0,0),(-1,-1),.5,LINE),('LEFTPADDING',(0,0),(-1,-1),13),('RIGHTPADDING',(0,0),(-1,-1),13),('TOPPADDING',(0,0),(-1,-1),10),('BOTTOMPADDING',(0,0),(-1,-1),7)]));return t
def T(headers,rows,widths=None,small=False):
 data=[[P(x,'head') for x in headers]]+[[P(x,'tiny' if small else 'cell') for x in r] for r in rows]
 t=Table(data,colWidths=widths or [W/len(headers)]*len(headers),repeatRows=1,hAlign='LEFT')
 t.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,0),NAVY),('VALIGN',(0,0),(-1,-1),'TOP'),('LEFTPADDING',(0,0),(-1,-1),7),('RIGHTPADDING',(0,0),(-1,-1),7),('TOPPADDING',(0,0),(-1,-1),5),('BOTTOMPADDING',(0,0),(-1,-1),5),('LINEBELOW',(0,0),(-1,0),.7,BLUE),('LINEBELOW',(0,1),(-1,-1),.35,LINE),('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F5FAFD')])]))
 return t
def banner(k,title,desc,toc):
 return [P('KUMOH MECHANICAL ENGINEERING  /  GUIDE '+k,'small'),P(title,'title'),P(desc,'sub'),P('구성  '+toc,'toc'),note('업로드 자료를 정리한 비공식 학생 안내서입니다. 검토일 2026-10-30. 엑셀 작성일은 확인되지 않았습니다. 개인별 교육과정 적용·인정학점은 본인의 학적 내역과 대조하세요.'),Spacer(1,12)]
def chapter(n,title):return [P(n+'  '+title,'h1')]
def footer(can,doc):
 can.saveState();can.setStrokeColor(CYAN);can.setLineWidth(2);can.line(48,A4[1]-30,A4[0]-48,A4[1]-30)
 can.setFont(F,7.5);can.setFillColor(MUTED);can.drawString(48,A4[1]-22,'기계공학전공 졸업 길잡이  |  업로드 자료 정리본')
 can.setStrokeColor(LINE);can.setLineWidth(.5);can.line(48,38,A4[0]-48,38)
 can.setFont(F,7.2);can.drawString(48,25,'검토 2026-10-30  /  국립금오공과대학교 기계공학부 기계공학전공')
 can.drawRightString(A4[0]-48,25,str(doc.page));can.restoreState()
def build(name,title,story):
 path=OUT/name; doc=SimpleDocTemplate(str(path),pagesize=A4,rightMargin=48,leftMargin=48,topMargin=48,bottomMargin=50,title=title,author='졸업 길잡이',subject='업로드 교과목 자료.xlsx 기반 학생 안내')
 doc.build(story)
 # Apply running headers and footers last so body flowables cannot hide them.
 reader=PdfReader(path);writer=PdfWriter()
 for number,page in enumerate(reader.pages,1):
  overlay=io.BytesIO();layer=canvas.Canvas(overlay,pagesize=A4)
  footer(layer,SimpleNamespace(page=number));layer.save();overlay.seek(0)
  page.merge_page(PdfReader(overlay).pages[0]);writer.add_page(page)
 writer.add_metadata({'/Title':title,'/Author':'졸업 길잡이','/Subject':'업로드 교과목 자료.xlsx 기반 학생 안내'})
 with path.open('wb') as target:writer.write(target)
 return path
def normalize(name):
 result=[]
 for row in RAW[name]:
  n=re.sub(r'\D','',next(iter(row)))
  vals={k:row.get(k+n,'') for k in 'ABCDEFGHIJKLMN'}
  if re.fullmatch(r'[A-Z]{2}\d{4}',vals['B']):vals['row']=int(n);vals['sheet']=name;result.append(vals)
 return result
REQ=normalize('필수 과목');OPT=normalize('선택 과목');MAJOR_REQ=[r for r in REQ if r['A']=='전공필수'];MAJOR_OPT=[r for r in OPT if r['A']=='전공선택']
assert len(MAJOR_REQ)==13 and sum(int(r['F']) for r in MAJOR_REQ)==32
assert len(MAJOR_OPT)==23 and sum(int(r['F']) for r in MAJOR_OPT)==69
COURSES={r['B']:r for r in REQ+OPT};COURSES['LA0211']=next(r for r in REQ if r['B']=='LA0211')
assert len(COURSES)==130
def standard_rows(data,flags=False):
 return [[r['B'],r['C'],r['D'] or '미기재',r['E'] or '미기재',r['F'] or '미기재',r['G'] or '미기재']+([r['H'],r['I']] if flags else []) for r in data]
def regular_table(data):return T(['코드','과목명','학년','학기','학점','설계'],standard_rows(data),[57,235,45,60,48,54])

# 01. 졸업요건과 비교과
s=banner('01','졸업요건과 비교과 안내','입학 연도와 인증과정을 먼저 확인하고, 학점 밖의 졸업 준비까지 살펴보세요.','01 학점 기준  /  02 교양  /  03 취업진로교육  /  04 인증·졸업학기  /  05 학적')
s+=chapter('01','입학 연도별 학점 기준')
s+=[T(['입학 연도','기초교양','MSC\n인증/비인증','교양선택','전공','총학점'],[['2025 이후','8','29 / 17','19','71','130'],['2015~2024','4','32 / 20','16','71','130'],['2014 이전','4','32 / 20','16','65','130']],[94,66,110,77,70,82]),source('기본사항!A8:P10, A18:P20'),P('MSC를 포함한 교양 합계는 2025 이후 인증 56·비인증 44학점, 이전 입학자 인증 52·비인증 40학점입니다. 위 표에서는 중복 합산을 막기 위해 교양과 MSC를 분리했습니다.'),P('2025 이후 표의 전공 구성은 기본전공 32학점과 추가선택 39학점입니다. 전공 합계를 채우는 것과 지정 필수과목을 이수하는 것은 각각 확인해야 합니다.'),note('표의 2024학년도 이전 행은 2014학년도 이전 행과 범위가 겹칩니다. 이 안내서는 더 좁은 2014 이전 기준을 먼저 적용하여 2015~2024 구간을 구분했습니다. 편입·전과·복학·재입학·다전공은 개인 적용을 별도로 확인하세요.'),P('학점 기준은 2026 공식 교육과정 17쪽과 대조했습니다. 이전 2025 자료의 전공 72학점·전공필수 34학점과 혼합하지 않습니다.','small')]
s+=[PageBreak()]+chapter('02','교양과 사회봉사')
s+=[P('2025학년도 이후 입학자','h2'),T(['구분','이수 기준'],[['기초교양','글쓰기와발표 2, 글로벌커뮤니케이션 3, 디지털문해력 3학점'],['학문기초·MSC','인증 11과목 29학점 / 비인증 지정 7과목 17학점'],['균형교양','인간과사상·정치와사회·언어와문학 각 영역에서 최소 1과목'],['일반교양','영역별 필수 조건 없이 선택'],['교양선택 합계','균형교양과 일반교양 합계 19학점 이상'],['사회봉사1','2025학년도 이후 입학자 졸업요건으로 이수']],[108,391]),source('기본사항!A29:G36; 필수 과목!A3:I16, A32:I32'),P('2024학년도 이전 입학자','h2'),P('2026 전공 기준표는 기초교양 4학점과 선택교양 16학점을 안내하며, 균형교양 영역별 최소 과목 조건은 없습니다. 엑셀의 필수과목 시트에는 현행 기초교양 3과목이 일괄 표시되어 있으므로 이를 구학번에게 모두 강제하지 않습니다.'),P('2026 공식 교육과정에서 디지털문해력은 2024 이전 입학자에게 MSC로 분류됩니다. 영어·글쓰기 동일대체과목과 기존 이수학점은 개인 내역을 확인하세요.'),note('사회봉사1은 필수·선택 두 시트에 함께 등장합니다. 같은 과목코드 LA0211은 한 과목이며, 2025 이후의 필수 조건과 이전 입학자의 선택 조건을 구분합니다.'),source('기본사항!A24:G26; 선택 과목!A110:N110; 보완: 2026 교육과정 18~19쪽'),P('학생이 준비할 정보','h2'),P('입학 연도 / 인증·비인증 과정 / 편입·전과·재입학 여부 / 성적표의 이수구분 / 동일대체 인정 내역. 구학번의 기초교양 4학점과 현행 과목 학점의 차이는 과목명을 바꾸어 단순 합산하지 말고 인정 결과로 확인합니다.')]
s+=[PageBreak()]+chapter('03','취업진로교육 8개 과정')
s+=[P('업로드 자료는 일반 학생의 학년별 두 과정씩 총 8개 과정, 편입생은 3~4학년의 4개 과정을 안내합니다. 같은 과정을 반복해 들어도 서로 다른 과정 두 개로 인정하지 않습니다.'),T(['학년','과정 1','과정 2'],[['1학년','취업진로교육 I-1','취업진로교육 I-2'],['2학년','취업진로교육 II-1','취업진로교육 II-2'],['3학년','취업진로교육 III-1','취업진로교육 III-2'],['4학년','취업진로교육 IV-1','취업진로교육 IV-2']],[81,209,209]),source('기본사항!C45:C48, C53:C56, G45, G59'),P('과정 이수와 교육 회차를 구분하세요.','h2'),P('각 과정에서 보강을 포함해 실시하는 5회 교육 중 한 회를 수강하면 해당 과정을 이수한 것으로 안내합니다. 교차 이수가 가능하며 학기당 최대 3개 과정까지 이수할 수 있습니다. 교육 회차 5회는 필요한 과정 수 8개와 다릅니다.'),P('이수 인정·경과 규정','h2'),T(['상황','자료에 기재된 인정 내용'],[['2019 이전 입학','이전 해당 학기의 진로교육을 이수한 것으로 간주. 2019년 기준 학년에 따라 8·6·4·2개 과정 적용. 2019년 8월 졸업예정자 별도 예외 조항 있음.'],['교환학생·학기제 현장실습','해당 학기 진로교육을 이수한 것으로 인정'],['이수 후 휴학·복학','이미 이수한 해당 학기 교육 인정'],['편입·재입학','이전 해당 학기 교육 인정'],['조기취업·조기졸업','조기취업은 해당 학기 인정, 조기졸업은 이수 인정 규정']],[115,384]),P('인정 결과는 학적 기록과 대조해야 합니다. 오래된 학번 또는 인정 예외가 있는 학생에게 8개가 모두 미이수라고 판정하지 않습니다.','small'),note('원문 확인사항: 기본사항 A52는 “1학기”로 표기되지만 C53:C56 과정명은 I-2~IV-2입니다. 이 안내서는 원문의 과정명을 보존하며 학기 제목의 불일치를 알립니다.')]
s+=[PageBreak()]+chapter('04','인증과정과 졸업학기 준비')
s+=[P('공식 자료로 보완한 항목','h2'),P('아래 항목은 엑셀에 상세 조건이 없어서 2026 공학교육인증 안내서와 전공의 졸업학기 공지를 함께 확인한 내용입니다. 인증과정 조건을 비인증 학생에게 자동 적용하지 않습니다.'),T(['인증과정 항목','2026 안내서의 최소달성기준'],[['설계학점','12학점. 과목 전체 학점과 설계학점은 다를 수 있음.'],['지도교수 상담','프로그램 진입부터 졸업까지 수강신청 가능한 학기 수만큼 상담하고, 그 수의 절반 이상 지도교수상담 과목 이수.'],['졸업설계','구두 발표 평가와 보고서 평가 심사 통과.'],['학습성과','프로그램의 학습성과별 요구조건 충족.'],['외국어','공인어학성적이 평가도구로 기재되어 있으나 이 자료 묶음만으로 특정 시험 점수·면제 조건은 확정하지 않음.']],[105,394]),P('자료: 2026 공학교육인증 안내서 23쪽. 현행 필수과목의 설계학점 합계 13을 최소 설계요건으로 바꾸어 해석하지 않습니다.','small'),P('2026-2학기 졸업논문','h2'),P('대상: 기계공학전공 7·8학기 재학생 및 수료생. 심사 기간은 2026.11.16.~12.4., 완성본 제출은 2026.12.7.까지로 공지되어 있습니다. 제출 서식·경로·대상자 여부는 해당 학기 원문을 확인하세요.'),P('2027년 2월 졸업예정자 학습성과 자료','h2'),P('기본소양 에세이와 출구면접 설문을 2026.11.16.~12.4. 정기상담 기간에 지도교수에게 제출하도록 안내합니다. 다른 졸업학기에는 이 날짜를 적용하지 않습니다.'),note('학점 합계가 충족되어도 필수과목, 세부 교양영역, 설계, 논문, 학습성과 등은 별도 확인이 필요합니다. 개인별 최종 졸업사정 결과는 이 안내서의 계산과 구분하세요.')]
s+=[PageBreak()]+chapter('05','학적 변동과 수강신청')
s+=[T(['항목','업로드 자료의 기준과 확인할 내용'],[['수강신청 상한','기본 최대 18학점. 직전 학기 평점 4.30 이상이면 21학점. 특별규정·학사경고 제한을 포함한 개인 한도는 별도 확인.'],['학사경고','학기 평점평균 1.75 미만. 졸업소요학점 초과 학생 및 졸업최종학기 학생 제외. 연속 2회 경고 시 다음 학기 최대 15학점으로 제한할 수 있으며, 재학 중 통산 4회는 제적.'],['타과 전공수강','별도 복수·부·융합과정이 아니면 일반선택으로 총졸업학점에 포함. 기계전공학점에 자동 산입하지 않음.'],['전과 신청','Onekit 통합정보시스템의 학적 > 전과신청. 기말고사 전 지정기간, 전출·전입 심사. 전입학과의 교육과정과 전 학년 필수과목 확인.'],['기계공학 전입','신청 직전 학기까지 평점평균 3.5 이상, 성적 100% 평가. 동점 시 이수성적·입학성적 순으로 기재.'],['기계공학 전출','허용인원 초과 시 전과지원사유서 추가 심사. 성적 90%, 사유서 10%(적합성 5·태도와 소양 5). 동점 시 이수성적·전공성적.']],[100,399]),source('학적!A5:F7, A11, A32:D35'),P('원문 F6:F7의 “전공변경 허용 안함”은 전과 안내와 함께 기재되어 있으나 적용 맥락이 명확하지 않습니다. 이를 모든 전과가 불가능하다는 뜻으로 확대하지 않습니다.','small'),P('자료 출처와 검토 범위','h2'),P('기본 자료: 교과목 자료.xlsx의 6개 시트. 앞서 업로드된 캡스톤 데이터 자료.xlsx와 내용이 동일하므로 독립된 두 출처로 세지 않았습니다. 셀에 문서 작성일과 규칙별 원문 URL은 기재되어 있지 않습니다.'),P('공식 보완: 2026 교육과정 운영기준 및 편성표 16~20쪽, 2026 공학교육인증 안내서 23쪽, 2026-2 논문 공지, 2027년 2월 학습성과 공지. 최신 개편·경과조치와 개인 인정내역은 별도 확인이 필요합니다.','small')]
urls=[('2026 교육과정 PDF','https://mecheng.kumoh.ac.kr/mecheng/sub020101.do?articleNo=570430&attachNo=166048&mode=download'),('2026 인증 안내서','https://biz.kumoh.ac.kr/abeek/sub040808.do?articleNo=556323&attachNo=162328&mode=download'),('2026-2 졸업논문 공지','https://www.kumoh.ac.kr/mecheng/sub020101.do?articleNo=579298&mode=view'),('2027.2 학습성과 공지','https://www.kumoh.ac.kr/mecheng/sub020101.do?articleNo=579814&mode=view')]
for title,url in urls:s.append(P(f'<link href="{escape(url)}" color="#007FB6">{title} 원문 확인</link>','small',True))
s.append(P('문의: 기계공학전공 사무실 054-478-7290 / 7304, 테크노관 105호.','small'))
p1=build('kit-graduation-guide.pdf','기계공학전공 졸업요건과 비교과 안내',s)

# 02. 전체 교과목 편성표
s=banner('02','교과목 편성·수강 가이드','전공필수와 전공선택을 나누고, 학기별 후보와 동일인정 정보를 확인하세요.','01 전공필수  /  02 전공선택  /  03 기초·MSC  /  04 교양선택  /  05 동일인정')
s+=[note('표의 학기 정보는 업로드 자료에 있는 편성학기입니다. 실제 해당 연도의 개설·분반·시간표·정원·선수조건은 확인되지 않았습니다. 학생이 선택한 학기의 미이수 필수과목을 먼저 검토하고 선택과목을 추가하세요.')]+chapter('01','전공필수 13과목 · 현행 편성 32학점')
s+=[regular_table(MAJOR_REQ),source('필수 과목!A17:N29'),P('각 과목의 학점은 현행 편성표 기준입니다. 이미 이수한 과목의 학점이나 구학번의 필수 이수내역에 소급하여 덮어쓰지 않습니다. 설계학점 합계와 인증과정의 최소설계 기준은 서로 구분합니다.','small')]
s+=[PageBreak()]+chapter('02','전공선택 23과목 · 편성목록 합계 69학점')
s+=[P('69학점은 목록에 있는 모든 선택과목의 학점 합계이며, 학생이 69학점을 모두 이수해야 한다는 뜻은 아닙니다. 졸업에 필요한 전공 합계와 본인의 필수 이수현황을 함께 확인하세요.'),regular_table(MAJOR_OPT),source('선택 과목!A3:N25')]
s+=[PageBreak()]+chapter('03','기초교양·학문기초·사회봉사')
foundation=[r for r in REQ if r['A']!='전공필수']
s+=[P('2025 이후 기초교양 3과목 8학점, 인증 MSC 11과목 29학점, 비인증 지정 MSC 7과목 17학점입니다. 구학번에게 현행 기초교양 3과목을 일괄 필수로 적용하지 않습니다.'),T(['코드','과목명','학년·학기','학점','인증','비인증'],[[r['B'],r['C'],(r['D'] or '미기재')+' / '+r['E'],r['F'],r['H'],r['I']] for r in foundation],[57,164,91,40,72,75]),source('필수 과목!A3:I16, A32:I32'),note('학문기초 중 일반화학1·컴퓨터프로그래밍언어·공학수학2·확률및통계는 비인증과정에서 선택으로 표기됩니다. 사회봉사1은 2025 이후 필수이고, 이전 입학자는 선택입니다. 구학번 디지털문해력의 이수구분은 MSC이므로 성적표를 대조하세요.')]
general=[r for r in OPT if not r['B'].startswith('CA') and r['B']!='LA0211']
groups=defaultdict(list)
for r in general:groups[r['A'].split(' (')[0]].append(r)
for index,(group,rs) in enumerate(groups.items()):
 s+=[PageBreak()]+chapter('04' if index==0 else '04 계속',group)
 s+=[P('2025 이후 균형교양은 세 영역 각각 최소 1과목을 포함하고, 일반교양과 합쳐 선택교양 19학점 이상을 이수합니다. 이전 입학자는 별도 연도별 기준을 확인하세요.' if group.startswith('균형') else '일반교양은 영역별 필수 조건 없이 자율 선택하는 영역입니다. 사회봉사1은 앞의 기초·MSC 표에 한 번만 수록했습니다.'),T(['코드','과목명','편성학기','학점'],[[r['B'],r['C'],r['E'] or '미기재',r['F'] or '미기재'] for r in rs],[64,292,84,59]),source(f'선택 과목!A{rs[0]["row"]}:N{rs[-1]["row"]}'),P('교양선택 목록의 학년 칸은 미기재입니다. 이를 모든 학년의 수강이 보장된다는 의미로 해석하지 않습니다.','small')]
s+=[PageBreak()]+chapter('05','SSU 동일인정이 명시된 기계공학 과목')
ssu=[r for r in MAJOR_REQ+MAJOR_OPT if r['J']]
s+=[P('아래는 기계공학 과목의 J열에 기재된 SSU 동일인정 대응입니다. 승인·과정별 한도·개인 이수구분을 확인해야 하며, 두 과목을 모두 이수했다고 총학점을 이중 산입하지 않습니다.'),T(['기계공학 과목','SSU 동일인정 기재'],[[r['B']+' '+r['C'],r['J']] for r in ssu],[230,269]),source('필수 과목·선택 과목의 J열'),note('번호에 주의하세요. 기계공학과제1(CA1014)은 SSU프로젝트2(SK0095), 기계공학과제2(CA1016)는 SSU프로젝트1(SK0086)과 대응합니다. 이름 끝 숫자로 자동 연결하지 않습니다.')]
s+=[PageBreak()]+chapter('05 계속','연계·융합 동일인정과 추가과정 표시')
ks=[r for r in MAJOR_REQ+MAJOR_OPT if r['K']]
s+=[T(['기계공학 과목','연계·융합 동일인정 기재'],[[r['B']+' '+r['C'],r['K']] for r in ks],[199,300]),source('필수 과목·선택 과목의 K열'),P('마이크로디그리·부전공·연계전공','h2'),T(['구분','엑셀에 표시된 기계공학 과목'],[['전산설계 및 해석마스터','CA1020 컴퓨터원용설계 / CA1024 수치해석 / CA1032 전산유체공학 / CA1038 유한요소법 / CA1058 최적설계'],['기계공학 부전공 필수','CA1004 고체역학1 / CA1005 열역학 / CA1009 유체역학'],['그린에너지 연계 중복인정','CA1009 유체역학 / CA1019 고체역학2 / CA1033 그린에너지공학 / CA1039 그린에너지시스템'],['창업 연계 중복인정','CA1009 유체역학 / CA1019 고체역학2 / CA1020 컴퓨터원용설계 / CA1011 기계요소설계']],[125,374]),source('필수 과목·선택 과목의 L:M:N열; 학적!A23:G28'),P('MD는 구성 5과목을 모두 필수로 해석하지 않습니다. 과정 기준은 12학점이며 세부 선택·인정 조합을 확인해야 합니다. 부전공 지정필수 9학점 외에도 총 21학점 이상이 필요합니다.','small')]
p2=build('kit-course-catalog.pdf','기계공학전공 교과목 편성·수강 가이드',s)

# 03. 융합·추가과정 및 전체 목록
s=banner('03','융합전공·추가이수 안내','과정별 이수학점과 동일인정 한도를 구분하고, SSU·AI로봇 교과목 전체 목록을 확인하세요.','01 과정별 기준  /  02 동일인정  /  03 SSU 121과목  /  04 AI로봇 51과목')
s+=chapter('01','추가 이수과정의 기준')
programs=[]
for r in RAW['학적']:
 n=re.sub(r'\D','',next(iter(r)))
 if 23<=int(n)<=28:programs.append({k:r.get(k+n,'') for k in 'ABCDEFG'})
s+=[T(['과정','신청·이수 조건','동일·중복 인정'],[[r['A'],r['B']+' / '+r['C'],r['D']] for r in programs],[85,238,176]),source('학적!A23:G28'),note('추가전공의 이수학점과 총 졸업 130학점·주전공 기준은 서로 다른 조건입니다. 엑셀의 표 머리글에 MD·융합전공이 있다고 해서 기계공학전공의 기본+총전공 경로를 대체하는 것으로 판단하지 않습니다.')]
s+=[PageBreak()]+chapter('01 계속','과정별로 확인할 내용')
for r in programs:
 s+=[P(r['A'],'h2'),P(r['E']+'. '+r['F']+'. '+r['G']+'.')]
s+=[note('마이크로디그리 구성은 5과목 각 3학점, 과정 기준은 12학점입니다. 모든 5과목이 필수라는 뜻은 아닙니다. SSU의 총 동일인정 15학점 중 2학년 교과 최대 9학점이라는 하위 한도도 함께 적용해야 합니다.'),P('연계전공의 현장실습 6학점(특정 창업실습 조건에서 9학점)은 현장실습 인정한도입니다. 이를 연계전공 전체의 중복인정 한도로 확대하지 않습니다.','small')]
def special(name):
 items=[]
 for r in RAW[name]:
  n=re.sub(r'\D','',next(iter(r)));code=r.get('H'+n,'')
  if re.fullmatch(r'(SK|AK)\d{4}',code):items.append({'row':int(n),'code':code,'name':r['G'+n],'note':r.get(('V' if code.startswith('SK') else 'N')+n,'')})
 return items
SSU=special('SSU반도체융합전공과목');AI=special('AI로봇 융합전공 과목')
assert len(SSU)==121 and len(AI)==51
def eq(item):
 m=re.search(r'(CA\d{4})\s+(.+?)\s*동일인정',item['note'])
 return (m[1]+' '+m[2]) if m else '동일인정 미기재'
s+=[PageBreak()]+chapter('02','명시된 동일인정 대응')
paired=[x for x in SSU+AI if re.search(r'CA\d{4}',x['note'])]
assert len([x for x in SSU if re.search(r'CA\d{4}',x['note'])])==19
assert len([x for x in AI if re.search(r'CA\d{4}',x['note'])])==5
s+=[P('SSU 19쌍, AI로봇 5쌍만 엑셀에 명시적으로 기재되어 있습니다. 전체 목록의 다른 과목을 이름이 비슷하다는 이유로 동일과목으로 처리하지 않습니다.'),T(['융합 과목','기계공학 동일인정 기재'],[[x['code']+' '+x['name'],eq(x)] for x in paired],[269,230]),source('SSU반도체융합전공과목!V5:V125; AI로봇 융합전공 과목!N5:N55'),P('동일인정은 적용 승인과 과정별 상한을 함께 확인해야 합니다. 두 과목을 수강했다고 총 졸업학점을 두 번 계산하지 않습니다.','small')]
s+=[PageBreak()]+chapter('03','SSU 반도체융합전공 전체 목록')
s+=[P('총 121개 과목입니다. 이 중 38개는 “양식 기재 과목”, 83개는 “전체편성 추가 과목”으로 구분되어 있습니다. 121개 전부가 기계공학 전용 트랙이나 동일인정 가능과목이라는 의미는 아닙니다.'),note('개설 학년·학기, 학점, 필수/선택, 트랙 배정, 이동수업·산학·설계·실습 여부는 이 시트에서 확인할 수 없습니다. 빈칸과 “-” 표기를 0·아니오로 바꾸지 않았으며, 대응 기계공학 과목의 학기·학점을 복사하지 않았습니다.')]
for label,items,chunk_size in [('양식 기재 과목 38개',SSU[:38],20),('전체편성 추가 과목 83개',SSU[38:],28)]:
 for start in range(0,len(items),chunk_size):
  batch=items[start:start+chunk_size]
  if start or items[0]['code']!=SSU[0]['code']:s+=[PageBreak()]+chapter('03 계속','SSU 반도체융합전공')
  heading=P(label+f' · {start+1}~{start+len(batch)}','h2')
  heading.keepWithNext=False
  s+=[heading,T(['코드','교과목명','동일인정 기재','원문쪽수'],[[x['code'],x['name'],eq(x),re.search(r'p\d+',x['note']).group() if re.search(r'p\d+',x['note']) else '미기재'] for x in batch],[58,227,161,53]),source(f'SSU반도체융합전공과목!G{batch[0]["row"]}:V{batch[-1]["row"]}')]
s+=[PageBreak()]+chapter('04','AI로봇 융합전공 전체 목록')
s+=[P('총 51개 과목입니다. 개설 학년·학기, 학점과 필수/선택 칸은 모두 미기재입니다. 다만 AK0046은 주석에 별도 이수요건상 필수라고 명시되어 있고, 학적 시트도 프로젝트 이수를 요구합니다.'),note('PBL기반AI로봇융합프로젝트(AK0046)의 학점·학기와 다른 캡스톤 과목과의 동일인정은 이 자료에 없습니다. 다음 학기 개설 과목으로 확정하거나 다른 프로젝트 이수로 자동 대체하지 않습니다.')]
for start,end in [(0,22),(22,42),(42,51)]:
 if start:s+=[PageBreak()]+chapter('04 계속',f'AI로봇 융합전공 · {start+1}~{end}')
 batch=AI[start:end]
 s+=[T(['코드','교과목명','동일인정·필수 주석'],[[x['code'],x['name'],eq(x) if 'CA' in x['note'] else '별도 이수요건상 필수' if '필수' in x['note'] else '미기재'] for x in batch],[61,240,198]),source(f'AI로봇 융합전공 과목!G{batch[0]["row"]}:N{batch[-1]["row"]}')]
s+=[P('모든 AI로봇 과목의 원문쪽수 주석은 p41입니다. 셀에는 원문 문서명과 URL이 기재되어 있지 않습니다.','small'),P('자료 기록','h2'),P('이 문서는 교과목 자료.xlsx를 검토일 2026-10-30에 정리한 자료입니다. 엑셀의 작성일은 미상입니다. 동일한 내용의 캡스톤 데이터 자료.xlsx를 별도 근거로 중복 집계하지 않았습니다. 목록의 빈값은 원문대로 미기재로 처리했습니다.'),P('원본 SHA-256: '+HASH,'tiny')]
p3=build('kit-convergence-guide.pdf','기계공학전공 융합전공·추가이수 안내',s)

manifest=[]
for path,title,description in [(p1,'졸업요건·비교과 안내','입학연도별 학점, 교양, 취업진로교육, 인증·졸업학기와 학적'),(p2,'교과목 편성·수강 가이드','전공필수 13과목, 전공선택 23과목, 기초·MSC·교양과 동일인정'),(p3,'융합전공·추가이수 안내','추가과정 기준과 SSU 121개·AI로봇 51개 교과목 전체 목록')]:
 reader=PdfReader(path);text='\n'.join(page.extract_text() or '' for page in reader.pages)
 (OUT/(path.stem+'.txt')).write_text(text)
 manifest.append({'filename':path.name,'path':str(path),'title':title,'description':description,'pages':len(reader.pages),'bytes':path.stat().st_size,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'reviewed':'2026-10-30','source_file':'교과목 자료.xlsx','source_sha256':HASH})
 if '\ufffd' in text: raise ValueError('Text replacement character in '+path.name)
 if len(text)<1000:raise ValueError('Unexpectedly sparse PDF '+path.name)
text2=(OUT/'kit-course-catalog.txt').read_text();text3=(OUT/'kit-convergence-guide.txt').read_text()
missing=[code for code in COURSES if code not in text2]
assert not missing,missing
assert all(x['code'] in text3 for x in SSU+AI)
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps(manifest,ensure_ascii=False,indent=2))
