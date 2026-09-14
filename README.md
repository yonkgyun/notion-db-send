# 빠른 할일/노트 추가

휴대폰 홈화면에 설치해서 Notion 데이터베이스에 할일 또는 노트를 빠르게 저장하는 PWA입니다.

## 화면 구성

- 상단 2x2 대시보드에서 오늘 기록한 할일과 노트 수를 확인합니다. 아래 두 칸은 준비 중입니다.
- 두 개수는 한국 시간(Asia/Seoul) 오늘 00:00부터 다음 날 00:00 전까지 **새로 생성된 페이지**를 집계합니다. 할일의 지정 날짜/완료 여부와 무관하며, 이 앱 외에 Notion에서 직접 기록한 항목도 포함합니다. 휴지통 항목은 제외합니다.
- 카드를 누르면 제공한 Notion 데이터베이스 보기로 이동합니다. 해당 보기의 기존 필터에 따라 보이는 항목 수는 오늘 생성 수와 다를 수 있습니다.
- 저장 후, 앱으로 돌아왔을 때, 한국 시간 자정에 개수를 갱신하며 새로고침 버튼으로도 다시 조회할 수 있습니다.
- 추가 환경변수 없이 기존 `NOTION_API_KEY`, `NOTION_DATABASE_ID`, `NOTION_NOTES_DATABASE_ID`를 사용합니다. 연결에 콘텐츠 읽기 권한이 필요합니다.
- 집계 구현은 기존 API 버전에 맞춘 [Notion 조회 API](https://developers.notion.com/reference/post-database-query)와 [생성 시간 필터](https://developers.notion.com/reference/post-database-query-filter)를 사용합니다.
- 대시보드 아래에서 `할일` 또는 `노트`를 선택합니다. 입력 폼과 저장 버튼은 하단에 있습니다.
- 선택한 탭과 저장 버튼은 같은 파란색입니다. 제목이 비어 있을 때 저장 버튼은 옅게 표시됩니다.
- 날짜를 지정하지 않으면 `날짜선택`으로 표시하며, 저장 시 한국 시간 오늘 날짜를 사용합니다.
- `할일` 모드: 유형, 날짜, 제목, 메모, 본문, 사진을 저장합니다.
- `노트` 모드: 분류, 제목, 메모, 사진을 저장합니다.
- 노트의 `생성 일시`는 Notion이 자동으로 기록하므로 앱에서 따로 입력하지 않습니다.

## 환경변수

`.env` 파일 또는 Vercel Environment Variables에 아래 값을 넣습니다.

```env
NOTION_API_KEY=secret_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 할일 데이터베이스
NOTION_DATABASE_ID=할일_데이터베이스_ID
NOTION_NAME_PROPERTY=이름
NOTION_DATE_PROPERTY=날짜
NOTION_TYPE_PROPERTY=명료화
NOTION_MEMO_PROPERTY=메모

# 노트 데이터베이스
NOTION_NOTES_DATABASE_ID=2dc9b10024d9814da3e7d86e7e9ffd17
NOTION_NOTES_NAME_PROPERTY=이름
NOTION_NOTES_TYPE_PROPERTY=분류
NOTION_NOTES_MEMO_PROPERTY=메모
```

`.env` 파일은 비밀번호 같은 파일이므로 GitHub에 올리지 않습니다.

## 설치와 실행

처음 한 번만 설치합니다.

```bash
npm install
```

로컬에서 확인합니다.

```bash
npm run dev
```

브라우저에서 아래 주소를 엽니다.

```text
http://localhost:5173
```

## Vercel 배포

1. 수정한 파일을 GitHub에 올립니다.
2. Vercel 프로젝트로 이동합니다.
3. `Settings` → `Environment Variables`에 위 환경변수를 넣습니다.
4. `Deployments`에서 다시 배포합니다.

배포 후 휴대폰 브라우저에서 사이트를 열고 `홈 화면에 추가`를 누르면 앱처럼 사용할 수 있습니다.

## 검증

`npm test`로 한국 날짜 경계, 100개 초과 기록의 페이지 나눔, 오류와 0개 구분, 데이터베이스별 오류 처리, 링크 및 API 메서드를 검사합니다. 이 테스트는 실제 Notion 데이터를 변경하지 않습니다.

업로드할 때 `api`, `lib`, `shared`, `src`, `public` 폴더를 모두 포함합니다. `node_modules`, `dist`, 실제 `.env`는 올리지 않습니다. 로컬에 환경변수가 없으면 실제 기록 수는 조회되지 않으며, Vercel의 기존 환경변수는 그대로 사용합니다.
