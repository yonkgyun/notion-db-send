# 빠른 등록

갤럭시 홈화면에 설치해서 바로 메모를 입력하고, Notion 데이터베이스에 새 페이지를 만드는 PWA입니다.

## 폴더 구조

```text
quick-notion-pwa/
  api/
    create-page.js
  public/
    icon.svg
    icon-192.png
    icon-512.png
    manifest.webmanifest
    sw.js
  src/
    main.jsx
    styles.css
  .env.example
  index.html
  package.json
  vercel.json
  vite.config.js
```

## 설치 방법

```bash
npm install
cp .env.example .env
```

`.env`에 Notion 값을 입력합니다.

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

전체 기능을 로컬에서 확인하려면 Vercel 개발 서버를 사용합니다.

```bash
npm run dev:vercel
```

화면만 빠르게 확인하려면 아래 명령을 사용할 수 있습니다.

```bash
npm run dev
```

## Notion 연동 방법

1. Notion에서 Integration을 만들고 Internal Integration Secret을 복사합니다.
2. 대상 데이터베이스 오른쪽 위 `...` 메뉴에서 Integration을 연결합니다.
3. 데이터베이스 속성을 아래처럼 준비합니다.

```text
제목: Title
등록일: Date
상태: Status
작성자: Text
```

4. 데이터베이스 URL에서 ID를 복사해 `NOTION_DATABASE_ID`에 넣습니다.

앱은 저장 시 아래 값으로 새 페이지를 생성합니다.

```text
제목: 입력한 내용 전체
등록일: 현재 날짜
상태: 대기
작성자: 김용균
```

## Vercel 배포 방법

1. 이 폴더를 GitHub 저장소로 올립니다.
2. Vercel에서 새 프로젝트로 Import합니다.
3. Framework Preset은 Vite로 둡니다.
4. Environment Variables에 아래 값을 추가합니다.

```text
NOTION_API_KEY
NOTION_DATABASE_ID
```

5. Deploy를 누릅니다.

배포 후 갤럭시 Chrome에서 사이트를 열고 메뉴의 `홈 화면에 추가`를 선택하면 앱처럼 설치할 수 있습니다.

## 동작

- 앱 실행 시 입력 화면만 표시됩니다.
- 저장 중에는 버튼이 비활성화되어 중복 저장을 막습니다.
- 성공하면 입력창을 비우고 다시 포커스를 둡니다.
- 실패하면 토스트로 오류를 보여줍니다.
