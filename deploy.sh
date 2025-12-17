#!/bin/bash

# EatsRun API Railway 배포 스크립트
# 사용법: ./deploy.sh

set -e  # 에러 발생 시 중단

echo "🚀 EatsRun API Railway 배포 시작..."
echo ""

# 1. Railway 로그인 확인
echo "1️⃣ Railway 로그인 확인..."
if ! railway whoami &> /dev/null; then
    echo "❌ Railway에 로그인되어 있지 않습니다."
    echo "다음 명령어를 실행해주세요: railway login"
    exit 1
fi
echo "✅ 로그인 확인 완료"
echo ""

# 2. 프로젝트 연결 확인
echo "2️⃣ 프로젝트 연결 확인..."
if [ ! -f "railway.json" ] && [ ! -f ".railway/config.json" ]; then
    echo "⚠️ Railway 프로젝트가 초기화되지 않았습니다."
    echo "다음 명령어를 실행해주세요: railway init"
    exit 1
fi
echo "✅ 프로젝트 연결 확인 완료"
echo ""

# 3. 환경 변수 확인
echo "3️⃣ 필수 환경 변수 확인..."
REQUIRED_VARS=("JWT_SECRET" "JWT_REFRESH_SECRET" "NODE_ENV" "PORT")
for var in "${REQUIRED_VARS[@]}"; do
    if ! railway variables | grep -q "$var"; then
        echo "⚠️ 환경 변수 '$var'가 설정되지 않았습니다."
        echo "다음 명령어로 설정해주세요:"
        echo "railway variables set $var=\"값\""
    fi
done
echo "✅ 환경 변수 확인 완료"
echo ""

# 4. 빌드 테스트
echo "4️⃣ 로컬 빌드 테스트..."
if npm run build; then
    echo "✅ 빌드 성공"
else
    echo "❌ 빌드 실패"
    exit 1
fi
echo ""

# 5. 배포
echo "5️⃣ Railway 배포 실행..."
if railway up; then
    echo "✅ 배포 성공"
else
    echo "❌ 배포 실패"
    exit 1
fi
echo ""

# 6. 데이터베이스 마이그레이션
echo "6️⃣ 데이터베이스 마이그레이션..."
echo "Prisma 클라이언트 생성..."
railway run npm run db:generate
echo "데이터베이스 스키마 푸시..."
railway run npm run db:push
echo "✅ 마이그레이션 완료"
echo ""

# 7. 시드 데이터 (선택)
read -p "7️⃣ 시드 데이터를 삽입하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "시드 데이터 삽입..."
    railway run npm run db:seed
    echo "✅ 시드 데이터 삽입 완료"
fi
echo ""

# 8. 도메인 확인
echo "8️⃣ 배포 도메인 확인..."
DOMAIN=$(railway domain 2>&1)
echo "🌐 배포 URL: $DOMAIN"
echo ""

# 9. Health Check
echo "9️⃣ API Health Check..."
if curl -s -o /dev/null -w "%{http_code}" "$DOMAIN/health" | grep -q "200"; then
    echo "✅ API 정상 작동 중"
else
    echo "⚠️ API가 아직 시작 중이거나 오류가 있습니다."
    echo "로그 확인: railway logs"
fi
echo ""

echo "✨ 배포 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. API 테스트: curl $DOMAIN/v1/events"
echo "2. 로그 확인: railway logs"
echo "3. 프론트엔드 환경 변수 업데이트:"
echo "   EXPO_PUBLIC_API_URL=$DOMAIN/v1"
echo ""
