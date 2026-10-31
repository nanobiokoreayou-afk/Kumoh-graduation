# Browser-local PDF and OCR dependencies

Loaded only when a student selects a PDF. All processing remains in the browser.

- PDF.js / `pdfjs-dist` 6.4.299: Apache-2.0, `pdfjs/LICENSE`.
- Tesseract.js 7.0.0: Apache-2.0, `tesseract/LICENSE`.
- Tesseract.js Core 7.0.0 (LSTM, SIMD and relaxed SIMD variants): Apache-2.0, `tesseract/CORE-LICENSE`.
- `tesseract-ocr/tessdata_fast` Korean and English LSTM models, downloaded 2026-10-30: Apache-2.0, `tessdata/LICENSE`.

Model source: https://github.com/tesseract-ocr/tessdata_fast

SHA-256:

```
eng 7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2
kor 6b85e11d9bbf07863b97b3523b1b112844c43e713df8b66418a081fd1060b3b2
```

Regenerate using `npm ci` followed by `python scripts/vendor_transcript_assets.py` from the project root. No transcript or student data is included here.
