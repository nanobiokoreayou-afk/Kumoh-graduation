# 비공개 GitHub + 각자의 Codex 공동 개발 절차

작성 기준: 2026-10-31 (한국 시간). GitHub와 Codex의 메뉴 이름은 화면 언어·계정에 따라 조금 다를 수 있습니다.

공유 구조는 `기능 브랜치에서 수정 → Pull Request(PR) → 다른 팀원 검토 → main에 병합`입니다. GitHub는 공동 코드와 변경 이력을 보관하고, 각자의 Codex는 그 코드를 가져와 작업합니다. 이 대화의 기록·계정 메모리·첨부 자료·학생 분석 기록은 GitHub 저장소로 자동 전달되지 않습니다. 이 문서와 README.md, AGENTS.md가 인수인계 자료 역할을 합니다.

## 1. 준비하기

대표자와 팀원 각각 GitHub 계정과 Codex를 사용할 수 있는 본인 계정을 준비합니다. 계정을 공유하지 않고, 각자의 GitHub 연결을 사용합니다.

대표자는 [GitHub Desktop](https://desktop.github.com/download/)을 설치하고 GitHub에 로그인합니다. Desktop 방식은 Windows와 macOS 기준입니다. Linux 사용자는 이 문서 끝의 Git 명령 방식을 사용할 수 있습니다.

이 ZIP에는 실행 코드, 교과자료, 배포용 안내 PDF, 검증 코드가 들어 있습니다. 개인 성적표, 추출한 개인 행, Git 인증 정보와 기존 사이트의 호스팅 연결 설정은 들어 있지 않습니다. 기존 사이트는 그대로 운영되며 이 사본과 자동으로 동기화되지 않습니다.

## 2. 대표자가 저장소를 처음 만들기

GitHub Desktop에서 `File → New repository`를 선택합니다. 저장소 이름을 `kumoh-me-graduation`으로 정하고 Local path를 선택합니다. 빈 저장소를 만들고, 압축 해제한 폴더의 **내용 전체**를 새 저장소 폴더 안에 복사합니다. 폴더를 한 단계 더 넣지 마세요.

최상위에 `package.json`, `README.md`, `AGENTS.md`, `dist`, `data`, `checks`, `.github`, `.gitignore`가 보이면 맞습니다. macOS에서 숨김 파일이 안 보이면 Finder에서 Command+Shift+.로 표시합니다. 새 저장소가 만든 `.git` 폴더는 그대로 둡니다.

GitHub Desktop의 Changes에 파일이 나타나면 Summary에 `Initial graduation chatbot`을 입력하고 `Commit to main`을 누릅니다. 기본 브랜치가 다르면 이름을 main으로 맞춥니다. `Publish repository`에서 **Keep this code private**를 체크한 채 발행합니다. GitHub에서 저장소 이름 옆의 Private 표시를 확인합니다.

GitHub 웹사이트에서 별도의 빈 저장소를 먼저 만들 필요는 없습니다. ZIP 파일 자체를 올리는 대신 풀어 놓은 파일들을 커밋해야 Codex가 코드를 읽을 수 있습니다. Desktop은 .github 같은 숨김 폴더도 Git에 포함합니다.

[공식 GitHub Desktop 생성 안내](https://docs.github.com/en/desktop/overview/creating-your-first-repository-using-github-desktop)와 [비공개로 발행하는 방법](https://docs.github.com/en/desktop/adding-and-cloning-repositories/adding-an-existing-project-to-github-using-github-desktop)을 참고하세요.

## 3. 팀원 초대하기

대표자가 GitHub 웹사이트의 저장소에서 `Settings → Collaborators → Add people`을 엽니다. 팀원의 GitHub 사용자 이름 또는 이메일로 찾아 초대합니다. 팀원이 초대 이메일이나 GitHub 알림에서 수락해야 접근할 수 있습니다.

개인 소유 저장소에서는 공동 작업자를 추가하는 방식입니다. 조직 소유 저장소의 역할 설정과 화면은 다를 수 있습니다. GitHub Free도 비공개 저장소와 공동 작업자 추가를 지원합니다.

[공식 공동 작업자 초대 절차](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/repository-access-and-collaboration/inviting-collaborators-to-a-personal-repository)

## 4. 각자 Codex에 연결하기

각 팀원이 자기 계정에서 다음 과정을 진행합니다.

1. GitHub에 로그인하여 초대한 비공개 저장소가 실제로 열리는지 확인합니다.
2. ChatGPT 웹 또는 데스크톱에서 `Work in → Cloud → Select environment`를 열고 `Create environment`를 선택합니다. 이전 화면을 쓰는 경우에는 Codex의 환경 설정에서 저장소를 추가합니다.
3. 본인의 GitHub 계정을 연결하고 공동 저장소를 선택합니다. GitHub 연결 승인 화면에서 이 저장소에 접근할 수 있도록 설정합니다. 저장소 소유자에게 GitHub App 설치나 저장소 접근 승인을 요청해야 하는 경우도 있습니다.
4. `Get started`로 준비를 시작합니다. 아래 환경 준비 문구를 전달합니다.
5. 설정·검사 결과를 확인한 뒤 환경의 `Publish`를 누르고 `Environment published`를 기다립니다.
6. `Start a new task`로 작업을 시작합니다.

이때 Publish는 개발 환경을 준비하는 단계입니다. 웹사이트를 인터넷에 새로 배포하는 단계가 아닙니다. 환경 공유와 저장소 접근권한은 별개이며, 각자의 GitHub 계정에 저장소 권한이 있어야 합니다. 계정별 Codex 사용 가능 여부와 한도는 사용 중인 요금제·관리자 설정에 따릅니다.

환경 준비 문구:

```text
이 저장소는 금오공대 기계공학전공 졸업 안내 웹 앱이다.
README.md, AGENTS.md, TEAM_GUIDE.md를 읽고 개발 환경을 준비해 줘.
Node.js 24와 Python 3를 사용하고 저장소 루트에서 npm ci, npm test를 실행해 줘.
정적 HTML/CSS/JS 구조이고 별도 프레임워크 빌드는 없다.
웹 미리보기는 프로젝트의 dist 폴더를 HTTP로 제공하면 된다.
현재 앱에는 OpenAI API 키가 필요하지 않다.
환경 설정과 검사까지만 진행하고 운영 사이트는 배포하지 마.
```

이 프로젝트의 node 기반 기본 검사는 학생 데이터 없이 실행됩니다. OCR·화면 브라우저 검사까지 필요하면 아래의 선택 설치를 추가합니다.

[현재 Codex Cloud 절차](https://learn.chatgpt.com/docs/cloud) 및 [개인별 GitHub 연결·환경과 작업의 관계](https://help.openai.com/en/articles/20001545-using-codex-cloud)

## 5. 기능 하나를 맡아 작업하기

GitHub Issues에 할 일을 하나씩 등록하면 중복 작업을 줄일 수 있습니다. 예: 상담 화면 개선, OCR 인식 오류 수정, 졸업요건 데이터 갱신. 작업 담당자를 지정하고 관련 파일을 적습니다.

main은 검토를 거친 공통 버전입니다. 브랜치는 변경을 따로 작업하는 공간이고, PR은 그 변경을 main에 합쳐 달라는 검토 요청입니다.

각자 Codex에서 아래처럼 요청합니다. `<작업 내용>`만 자신이 맡은 내용으로 바꾸세요.

```text
README.md와 AGENTS.md를 먼저 읽어 줘.
원격 저장소의 최신 main을 확인하고 feature/my-task 브랜치에서 작업해 줘.
작업 내용: <작업 내용>
요청한 변경을 구현하고 관련 검사를 실행해 줘.
변경 파일, 동작 차이, 검사 결과를 정리해 커밋하고 원격 작업 브랜치에 푸시해 줘.
main 대상 PR을 만들어 줘. 직접 병합하거나 운영 사이트를 배포하지 마.
```

작업마다 겹치지 않는 브랜치 이름을 사용합니다. 예: `feature/mobile-summary`, `fix/pdf-grade-reader`, `data/curriculum-update`. 팀원 전체가 한 브랜치를 동시에 수정하는 방식은 피합니다.

이 대화에서 정한 세부 요구사항은 각자의 Codex에 자동 공유되지 않습니다. 변경할 요구는 Issue·README·AGENTS에 기록해야 다음 작업자가 이어받을 수 있습니다.

## 6. PR 검토 후 합치기

변경 브랜치가 GitHub에 올라오면 Codex에서 PR을 만들거나, 저장소의 `Compare & pull request`를 사용합니다. base가 main, compare가 작업 브랜치인지 확인합니다.

다른 팀원은 PR의 Files changed에서 변경을 읽고 Checks에서 `Unit tests`를 확인합니다. 실제 화면을 바꿨다면 동작도 확인하고 승인합니다. 보완이 필요하면 PR에 의견을 남기고 작성자가 같은 작업 브랜치를 수정하게 합니다.

검토가 끝나면 대표자 또는 담당자가 `Squash and merge`로 main에 합칩니다. 다음 작업자는 최신 main을 다시 받아 새 브랜치를 만듭니다. PR을 만들었다고 코드가 자동으로 합쳐지는 것은 아닙니다.

코드 묶음에 `.github/workflows/checks.yml`을 포함했습니다. GitHub Actions가 허용된 저장소에서는 PR과 main 푸시에 Node 검사 26개를 실행합니다. 화면·OCR에 대한 검사는 별도로 실행해야 합니다. 워크플로 파일을 준비한 것이며 실제 GitHub에서 실행된 결과는 저장소를 발행한 뒤 확인합니다.

충돌이 생기면 작업 브랜치에 최신 main을 반영해 충돌 부분을 해결하고 검사를 다시 실행합니다. 공유 main의 이력을 강제 푸시로 덮어쓰지 않습니다.

[공식 PR 생성·검토 흐름](https://docs.github.com/en/pull-requests/how-tos/create-pull-requests/creating-a-pull-request)

## 7. main 보호 설정 (지원되는 요금제에서)

저장소 Settings → Branches → Add classic branch protection rule에서 main을 지정하고 PR을 통한 병합, 다른 사람 1명의 승인, Unit tests 검사 통과를 요구할 수 있습니다. 상태 검사는 첫 워크플로가 실행된 뒤 선택합니다.

GitHub 비공개 저장소의 보호 브랜치는 Pro·Team·Enterprise 등 지원되는 요금제에 따라 제공됩니다. 지원하지 않는 요금제에서도 PR 검토 방식으로 개발할 수 있지만 직접 main에 쓰는 일을 플랫폼에서 강제 차단하지 못할 수 있습니다. 먼저 팀 규칙으로 운영하고 필요한 경우에 보호 기능을 설정하세요.

[공식 보호 브랜치 지원 범위와 설정](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/managing-a-branch-protection-rule)

## 8. 내 컴퓨터에서 실행하기

Node.js 24, Python 3를 준비합니다. 프로젝트 루트에서 다음을 실행합니다.

```sh
npm ci
npm test
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

브라우저에서 http://127.0.0.1:4173 을 엽니다. Windows에서 python이 없고 py 런처를 사용한다면 마지막 명령의 python을 py로 바꿉니다. macOS/Linux에서는 설치 형태에 따라 python3를 사용합니다. 서버 종료는 해당 터미널에서 Ctrl+C입니다. HTML 파일을 더블클릭하면 모듈·OCR 처리가 제한될 수 있으므로 HTTP 서버로 실행합니다.

브라우저 검사까지 실행하려면 Python 가상 환경에서 다음 패키지를 준비합니다.

```sh
python -m pip install playwright reportlab
python -m playwright install chromium
python checks/browser_qa.py
python checks/advisor_qa.py
```

Linux에서 브라우저 운영체제 라이브러리가 부족하면 `python -m playwright install --with-deps chromium` 또는 환경 관리자의 설치가 필요할 수 있습니다. 브라우저 검사는 설치된 Chromium을 탐색하고, 없으면 Playwright가 설치한 브라우저를 사용합니다. 필요 시 KIT_CHROMIUM_EXECUTABLE 환경변수에 브라우저 실행 파일 경로를 지정할 수 있습니다.

이미 완성된 안내 PDF와 OCR 모델은 포함되어 있어 기본 앱 실행에는 별도 PDF 생성·모델 다운로드가 필요하지 않습니다. PDF 재생성용 추가 패키지와 글꼴 조건은 README.md를 참고하세요.

## 9. 현재 운영 사이트 반영하기

현재 Sites 사이트는 이 GitHub 저장소와 자동 연결되어 있지 않습니다. main에 합쳐도 기존 웹 주소의 내용은 자동으로 바뀌지 않습니다. 원래 사이트를 소유한 담당자가 검토된 main 버전을 가져와 기존 Sites 프로젝트에 반영하고 검증한 뒤 배포해야 합니다. 이때 기존 사이트의 공유 범위와 연결 설정을 유지합니다.

대표자가 나중에 별도 호스팅의 GitHub 자동 배포를 설정할 수 있습니다. 그 전까지는 GitHub를 공동 개발의 기준 저장소로 삼고 사이트 배포는 한 담당자가 맡는 편이 단순합니다. 사이트의 편집 권한과 GitHub의 공동 작업자 권한은 서로 독립적입니다.

## 10. 막힐 때 확인할 것

| 증상 | 확인할 항목 |
|---|---|
| GitHub에서 저장소가 보이지 않음 | 올바른 계정인지, 공동 작업자 초대를 수락했는지 |
| GitHub에서는 보이지만 Codex에는 없음 | 본인의 GitHub 연결·앱 설치 범위에 해당 비공개 저장소가 포함됐는지, 환경에서 선택했는지 |
| 코드는 읽지만 푸시 실패 | 저장소 쓰기 권한, 연결된 계정, 브랜치 보호, Git 설정 |
| Codex Cloud 메뉴가 없음 | 계정의 사용 가능 기능·요금제·워크스페이스 관리자 설정 |
| PR 검사가 실행되지 않음 | .github 폴더가 저장소 루트에 포함됐는지, 저장소 Actions 설정이 허용되는지 |
| main에 합쳤는데 사이트가 그대로임 | 기존 Sites와 자동 배포가 연결되지 않은 정상 상태. 담당자가 별도 반영·배포 |

## Git 명령으로 처음 올리는 대안

Desktop 대신 명령줄을 선호하면 GitHub 웹사이트에서 Private 저장소를 만들고 README·gitignore·license 자동 생성을 선택하지 않습니다. 압축 해제한 프로젝트 폴더에서 다음 명령을 사용합니다. YOUR_ID를 실제 GitHub 계정명으로 바꾸세요.

```sh
git init -b main
git add .
git commit -m "Initial graduation chatbot"
git remote add origin https://github.com/YOUR_ID/kumoh-me-graduation.git
git push -u origin main
```

GitHub 인증은 GitHub CLI의 `gh auth login`이나 Git Credential Manager 등 본인 계정의 로그인 절차로 설정합니다. 비밀번호·토큰을 코드나 채팅에 붙여 넣지 않습니다. Desktop으로 이미 올렸다면 이 초기화 절차를 반복할 필요가 없습니다.
