# JLR 일산서비스 설정관리

Vercel에 별도 배포해서 확장프로그램 공통 설정을 관리하는 작은 관리자 사이트입니다.

## 환경변수

Vercel 프로젝트에 아래 환경변수를 설정해야 저장 기능이 동작합니다.

- `ADMIN_TOKEN`: 관리자 저장용 비밀 토큰
- `REDIS_URL`: Vercel Redis 연결 URL

## API

- `GET /api/settings`: 확장프로그램과 관리자 사이트가 현재 설정을 읽습니다.
- `POST /api/settings`: 관리자 사이트가 설정을 저장합니다. `X-Admin-Token` 헤더가 필요합니다.
- `POST /api/emission-parts`: 관리자 사이트가 배출가스 부품 기준 엑셀 파일을 업로드합니다. `X-Admin-Token` 헤더가 필요합니다.

## 확장프로그램 연결

확장프로그램은 기본적으로 아래 주소를 사용하도록 설정되어 있습니다.

- 관리자 사이트: `https://jlr-settings-admin.vercel.app/`
- 설정 API: `https://jlr-settings-admin.vercel.app/api/settings`

Vercel 배포 도메인을 다르게 만들면 확장프로그램의 `options.js`, `background.js`, `manifest.json` 주소도 같은 도메인으로 바꿔야 합니다.

## 배출가스 부품 기준 업로드

설정관리 메인 화면에서 `.xlsx` 파일을 선택해 업로드하면 서버가 첫 번째 시트를 읽어 아래 열 기준으로 공통 설정에 저장합니다.

- A열: `Coverage`
- B열: `Description`
- C열: `INCL/EXCL`
- D열: 엔지니어링 번호
- E열: `ENG NO`
- F열: `BASE NAME`
