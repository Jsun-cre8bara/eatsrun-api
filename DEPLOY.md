# EatsRun API Railway 배포 가이드

## 1단계: Railway 로그인 및 초기화

```bash
cd C:\Users\MJ.LEE\Downloads\eatsrun-api

# Railway 로그인 (브라우저 열림)
railway login

# 프로젝트 초기화
railway init
# 프로젝트 이름: eatsrun-api

# PostgreSQL 추가 (선택 - 이미 있으면 스킵)
railway add postgresql
```

## 2단계: 환경 변수 설정

Railway 대시보드 또는 CLI로 환경 변수를 설정합니다.

### 방법 A: CLI로 설정 (추천)

```bash
# JWT Secrets (자동 생성된 값)
railway variables set JWT_SECRET="Jr1zD4/b7aKK4OAowsgUopHCpMJW/VFnfnmaDyYS0RY="
railway variables set JWT_REFRESH_SECRET="XluP3eAkzAXraK39nqeL6AZxcO9RdHMP04ZAbnySvWQ="

# JWT 만료 시간
railway variables set JWT_EXPIRES_IN="1h"
railway variables set JWT_REFRESH_EXPIRES_IN="14d"

# 서버 설정
railway variables set PORT="3000"
railway variables set NODE_ENV="production"

# 소셜 로그인 (나중에 설정)
railway variables set KAKAO_CLIENT_ID="your-kakao-client-id"
railway variables set NAVER_CLIENT_ID="your-naver-client-id"
railway variables set NAVER_CLIENT_SECRET="your-naver-client-secret"

# Firebase (선택 - 푸시 알림용)
# railway variables set FIREBASE_PROJECT_ID="your-project-id"
# railway variables set FIREBASE_PRIVATE_KEY="your-private-key"
# railway variables set FIREBASE_CLIENT_EMAIL="your-client-email"
```

### 방법 B: Railway 대시보드에서 설정

1. https://railway.app 접속
2. eatsrun-api 프로젝트 선택
3. Variables 탭 클릭
4. 위의 환경 변수 추가

**⚠️ 중요**: `DATABASE_URL`은 PostgreSQL 서비스 추가 시 자동으로 설정됩니다.

## 3단계: 배포

```bash
# 배포 실행
railway up

# 배포 상태 확인
railway status

# 로그 확인
railway logs
```

## 4단계: 데이터베이스 마이그레이션

```bash
# Prisma 클라이언트 생성 및 DB 푸시
railway run npm run db:generate
railway run npm run db:push

# 시드 데이터 삽입
railway run npm run db:seed
```

## 5단계: 도메인 확인

```bash
# 배포된 도메인 확인
railway domain

# 출력 예시:
# https://eatsrun-api-production.up.railway.app
```

## 6단계: API 테스트

```bash
# Health check
curl https://your-domain.railway.app/health

# 행사 목록 조회
curl https://your-domain.railway.app/v1/events
```

## 7단계: 프론트엔드 환경 변수 업데이트

배포된 도메인을 프론트엔드 `.env` 파일에 추가:

```env
EXPO_PUBLIC_API_URL=https://your-domain.railway.app/v1
```

## 트러블슈팅

### 빌드 실패 시
```bash
# 로컬에서 빌드 테스트
npm run build

# TypeScript 에러 확인
npx tsc --noEmit
```

### DB 연결 실패 시
```bash
# DATABASE_URL 확인
railway variables

# Prisma 클라이언트 재생성
railway run npx prisma generate
```

### 환경 변수 확인
```bash
railway variables
```

## 배포 후 체크리스트

- [ ] API 엔드포인트 응답 확인
- [ ] 데이터베이스 연결 확인
- [ ] 시드 데이터 확인 (관리자 계정 등)
- [ ] CORS 설정 확인 (프론트엔드 도메인 추가)
- [ ] 소셜 로그인 테스트
- [ ] 로그 모니터링 (`railway logs`)

## 재배포

코드 변경 후:

```bash
# 변경사항 커밋
git add .
git commit -m "Update API"

# 재배포
railway up
```

또는 GitHub 연동 시 자동 배포됩니다.

## 비용

Railway 무료 플랜:
- $5 크레딧/월
- 500시간 실행 시간
- 초과 시 종량제

프로덕션 추천:
- Hobby 플랜: $5/월 (고정)
