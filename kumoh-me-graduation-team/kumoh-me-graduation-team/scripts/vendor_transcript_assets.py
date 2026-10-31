"""Copy locked npm assets and verified language models for browser-local OCR."""
from pathlib import Path
import hashlib
import shutil
import urllib.request

ROOT=Path(__file__).resolve().parents[1]
VENDOR=ROOT/'dist/vendor'
def copy(source,target):
    dest=VENDOR/target
    dest.parent.mkdir(parents=True,exist_ok=True)
    shutil.copyfile(ROOT/'node_modules'/source,dest)

for name in ['pdf.mjs','pdf.worker.mjs']:
    copy('pdfjs-dist/build/'+name,'pdfjs/'+name)
copy('pdfjs-dist/LICENSE','pdfjs/LICENSE')
for name in ['tesseract.min.js','worker.min.js']:
    copy('tesseract.js/dist/'+name,'tesseract/'+name)
copy('tesseract.js/LICENSE.md','tesseract/LICENSE')
copy('tesseract.js-core/LICENSE','tesseract/CORE-LICENSE')
for mode in ['', 'simd-', 'relaxedsimd-']:
    for suffix in ['wasm','wasm.js']:
        name=f'tesseract-core-{mode}lstm.{suffix}'
        copy('tesseract.js-core/'+name,'tesseract/'+name)
hashes={'eng':'7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2',
        'kor':'6b85e11d9bbf07863b97b3523b1b112844c43e713df8b66418a081fd1060b3b2'}
for lang,digest in hashes.items():
    dest=VENDOR/'tessdata'/f'{lang}.traineddata'
    content=dest.read_bytes() if dest.exists() else urllib.request.urlopen(f'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/main/{lang}.traineddata',timeout=60).read()
    if hashlib.sha256(content).hexdigest()!=digest:raise ValueError(f'{lang} model hash differs; review before updating')
    dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(content)
print('PDF and OCR assets copied; model hashes verified.')
