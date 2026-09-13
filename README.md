# 빠른 할일/노트 추가

휴대폰 홈화면에 설치해서 Notion 데이터베이스에 할일 또는 노트를 빠르게 저장하는 PWA입니다.

## 화면 구성

- 상단에서 `할일` 또는 `노트`를 선택합니다.
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
