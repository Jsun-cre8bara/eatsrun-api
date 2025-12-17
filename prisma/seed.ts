import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Admin 계정 생성
  const adminPassword = await bcrypt.hash('admin1234', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@eatsrun.kr' },
    update: {},
    create: {
      email: 'admin@eatsrun.kr',
      passwordHash: adminPassword,
      name: '관리자',
      role: 'SUPER_ADMIN',
    },
  });
  console.log('✅ Admin created:', admin.email);

  // 2. 행사 생성
  const events = [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: '2025 춘천마라톤',
      type: 'RUNNING' as const,
      region: '강원 춘천시',
      description: '아름다운 호반의 도시 춘천에서 펼쳐지는 마라톤 대회',
      startDate: new Date('2025-03-15'),
      endDate: new Date('2025-03-15'),
      status: 'ACTIVE' as const,
      couponStartTime: '00:00',
      couponEndTime: '20:00',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440002',
      name: '정동진 해돋이축제',
      type: 'FESTIVAL' as const,
      region: '강원 강릉시',
      description: '새해 첫 해돋이를 맞이하는 축제',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-02'),
      status: 'ENDED' as const,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: '2025 서울 봄축제',
      type: 'FESTIVAL' as const,
      region: '서울시 종로구',
      description: '서울의 봄을 만끽하는 다양한 문화 체험 축제',
      startDate: new Date('2025-04-10'),
      endDate: new Date('2025-04-12'),
      status: 'UPCOMING' as const,
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440004',
      name: '부산 해운대 마라톤',
      type: 'RUNNING' as const,
      region: '부산시 해운대구',
      description: '해운대 해변을 따라 달리는 마라톤 대회',
      startDate: new Date('2025-05-20'),
      endDate: new Date('2025-05-20'),
      status: 'UPCOMING' as const,
    },
  ];

  const createdEvents = [];
  for (const eventData of events) {
    const event = await prisma.event.upsert({
      where: { id: eventData.id },
      update: {},
      create: eventData,
    });
    createdEvents.push(event);
    console.log('✅ Event created:', event.name);
  }

  const event1 = createdEvents[0]; // 춘천마라톤
  const event2 = createdEvents[1]; // 정동진 축제
  const event3 = createdEvents[2]; // 서울 봄축제
  const event4 = createdEvents[3]; // 부산 해운대 마라톤

  // 3. 상점 생성
  const merchantPassword = await bcrypt.hash('store1234', 10);
  
  const merchants = [
    {
      id: '550e8400-e29b-41d4-a716-446655440101',
      name: '춘천 막국수 본점',
      category: 'RESTAURANT' as const,
      address: '강원도 춘천시 중앙로 123',
      phone: '033-123-4567',
      businessNumber: '123-45-67890',
      latitude: 37.8813,
      longitude: 127.7298,
      email: 'makguksu@store.com',
      ownerName: '홍길동',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440102',
      name: '카페 온도',
      category: 'CAFE' as const,
      address: '강원도 춘천시 호반로 45',
      phone: '033-234-5678',
      businessNumber: '234-56-78901',
      latitude: 37.8756,
      longitude: 127.7312,
      email: 'ondo@store.com',
      ownerName: '김철수',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440103',
      name: '서울 한정식',
      category: 'RESTAURANT' as const,
      address: '서울시 종로구 인사동길 12',
      phone: '02-123-4567',
      businessNumber: '345-67-89012',
      latitude: 37.5735,
      longitude: 126.9788,
      email: 'hanjeongsik@store.com',
      ownerName: '이영희',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440104',
      name: '해운대 해산물집',
      category: 'RESTAURANT' as const,
      address: '부산시 해운대구 해운대해변로 264',
      phone: '051-123-4567',
      businessNumber: '456-78-90123',
      latitude: 35.1587,
      longitude: 129.1604,
      email: 'seafood@store.com',
      ownerName: '박민수',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440105',
      name: '스타벅스 종로점',
      category: 'CAFE' as const,
      address: '서울시 종로구 세종대로 172',
      phone: '02-234-5678',
      businessNumber: '567-89-01234',
      latitude: 37.5665,
      longitude: 126.9780,
      email: 'starbucks@store.com',
      ownerName: '최지영',
    },
  ];

  const createdMerchants = [];
  for (const merchantData of merchants) {
    const merchant = await prisma.merchant.upsert({
      where: { id: merchantData.id },
      update: {},
      create: {
        id: merchantData.id,
        name: merchantData.name,
        category: merchantData.category,
        address: merchantData.address,
        phone: merchantData.phone,
        businessNumber: merchantData.businessNumber,
        latitude: merchantData.latitude,
        longitude: merchantData.longitude,
        status: 'APPROVED',
        approvedAt: new Date(),
        merchantUsers: {
          create: {
            email: merchantData.email,
            passwordHash: merchantPassword,
            name: merchantData.ownerName,
            phone: merchantData.phone,
            role: 'OWNER',
          },
        },
      },
    });
    createdMerchants.push(merchant);
    console.log('✅ Merchant created:', merchant.name);
  }

  const merchant1 = createdMerchants[0];
  const merchant2 = createdMerchants[1];
  const merchant3 = createdMerchants[2];
  const merchant4 = createdMerchants[3];
  const merchant5 = createdMerchants[4];

  // 4. 행사-상점 연결
  const eventMerchants = [
    { eventId: event1.id, merchantId: merchant1.id }, // 춘천마라톤 - 막국수
    { eventId: event1.id, merchantId: merchant2.id }, // 춘천마라톤 - 카페온도
    { eventId: event3.id, merchantId: merchant3.id }, // 서울봄축제 - 한정식
    { eventId: event3.id, merchantId: merchant5.id }, // 서울봄축제 - 스타벅스
    { eventId: event4.id, merchantId: merchant4.id }, // 부산해운대 - 해산물집
  ];

  for (const em of eventMerchants) {
    await prisma.eventMerchant.upsert({
      where: { eventId_merchantId: { eventId: em.eventId, merchantId: em.merchantId } },
      update: {},
      create: {
        eventId: em.eventId,
        merchantId: em.merchantId,
        isActive: true,
      },
    });
  }
  console.log('✅ Event-Merchant relations created:', eventMerchants.length);

  // 5. 포스트 생성
  const posts = [
    // 춘천마라톤 포스트
    {
      id: '550e8400-e29b-41d4-a716-446655440201',
      eventId: event1.id,
      name: '춘천역 광장',
      category: 'TOURIST' as const,
      address: '강원도 춘천시 춘천역',
      latitude: 37.8847,
      longitude: 127.7177,
      isRewardPost: false,
      description: '춘천역 앞 광장에서 출발',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440202',
      eventId: event1.id,
      name: '소양강 스카이워크',
      category: 'TOURIST' as const,
      address: '강원도 춘천시 영서로 2663',
      latitude: 37.8912,
      longitude: 127.7856,
      isRewardPost: false,
      description: '소양강을 내려다보는 스카이워크',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440203',
      eventId: event1.id,
      merchantId: merchant1.id,
      name: '춘천 막국수 본점',
      category: 'RESTAURANT' as const,
      address: '강원도 춘천시 중앙로 123',
      latitude: 37.8813,
      longitude: 127.7298,
      isRewardPost: false,
      description: '춘천의 대표 맛집',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440204',
      eventId: event1.id,
      merchantId: merchant2.id,
      name: '카페 온도',
      category: 'CAFE' as const,
      address: '강원도 춘천시 호반로 45',
      latitude: 37.8756,
      longitude: 127.7312,
      isRewardPost: false,
      description: '호반을 바라보는 카페',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440205',
      eventId: event1.id,
      name: '춘천 종합운동장 (교환소)',
      category: 'OTHER' as const,
      address: '강원도 춘천시 스포츠타운길 100',
      latitude: 37.8634,
      longitude: 127.7234,
      isRewardPost: true,
      description: '스탬프 교환소',
    },
    // 서울 봄축제 포스트
    {
      id: '550e8400-e29b-41d4-a716-446655440206',
      eventId: event3.id,
      name: '경복궁',
      category: 'TOURIST' as const,
      address: '서울시 종로구 사직로 161',
      latitude: 37.5796,
      longitude: 126.9770,
      isRewardPost: false,
      description: '조선왕조 제일의 궁궐',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440207',
      eventId: event3.id,
      merchantId: merchant3.id,
      name: '서울 한정식',
      category: 'RESTAURANT' as const,
      address: '서울시 종로구 인사동길 12',
      latitude: 37.5735,
      longitude: 126.9788,
      isRewardPost: false,
      description: '전통 한정식 전문점',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440208',
      eventId: event3.id,
      merchantId: merchant5.id,
      name: '스타벅스 종로점',
      category: 'CAFE' as const,
      address: '서울시 종로구 세종대로 172',
      latitude: 37.5665,
      longitude: 126.9780,
      isRewardPost: false,
      description: '서울 중심가의 카페',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440209',
      eventId: event3.id,
      name: '인사동 문화센터 (교환소)',
      category: 'OTHER' as const,
      address: '서울시 종로구 인사동길 44',
      latitude: 37.5715,
      longitude: 126.9795,
      isRewardPost: true,
      description: '스탬프 교환소',
    },
    // 부산 해운대 마라톤 포스트
    {
      id: '550e8400-e29b-41d4-a716-446655440210',
      eventId: event4.id,
      name: '해운대 해수욕장',
      category: 'TOURIST' as const,
      address: '부산시 해운대구 해운대해변로 264',
      latitude: 35.1587,
      longitude: 129.1604,
      isRewardPost: false,
      description: '부산의 대표 해수욕장',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440211',
      eventId: event4.id,
      merchantId: merchant4.id,
      name: '해운대 해산물집',
      category: 'RESTAURANT' as const,
      address: '부산시 해운대구 해운대해변로 264',
      latitude: 35.1587,
      longitude: 129.1604,
      isRewardPost: false,
      description: '신선한 해산물 전문점',
    },
  ];

  for (const post of posts) {
    await prisma.post.upsert({
      where: { id: post.id },
      update: {},
      create: post,
    });
  }
  console.log('✅ Posts created:', posts.length);

  // 6. 쿠폰 템플릿 생성
  const couponTemplates = [
    // 춘천마라톤 쿠폰
    {
      eventId: event1.id,
      name: '5,000원 할인권',
      category: 'RESTAURANT' as const,
      type: 'DISCOUNT_5000' as const,
      discountAmount: 5000,
      description: '제휴 식당에서 사용 가능한 5,000원 할인권',
      maxIssueCount: 1000,
    },
    {
      eventId: event1.id,
      name: '10,000원 할인권',
      category: 'RESTAURANT' as const,
      type: 'DISCOUNT_10000' as const,
      discountAmount: 10000,
      description: '제휴 식당에서 사용 가능한 10,000원 할인권',
      maxIssueCount: 500,
    },
    {
      eventId: event1.id,
      name: '음료 1잔 무료',
      category: 'CAFE' as const,
      type: 'FREE_DRINK' as const,
      discountAmount: 5000,
      description: '제휴 카페에서 음료 1잔 무료',
      maxIssueCount: 800,
    },
    {
      eventId: event1.id,
      name: '50% 할인권',
      category: 'RESTAURANT' as const,
      type: 'PERCENT_50' as const,
      discountAmount: 0,
      description: '제휴 식당에서 50% 할인',
      maxIssueCount: 300,
    },
    // 서울 봄축제 쿠폰
    {
      eventId: event3.id,
      name: '서울 한정식 10,000원 할인',
      category: 'RESTAURANT' as const,
      type: 'DISCOUNT_10000' as const,
      discountAmount: 10000,
      description: '서울 한정식에서 사용 가능',
      maxIssueCount: 500,
    },
    {
      eventId: event3.id,
      name: '스타벅스 아메리카노 무료',
      category: 'CAFE' as const,
      type: 'FREE_DRINK' as const,
      discountAmount: 4500,
      description: '스타벅스 아메리카노 1잔 무료',
      maxIssueCount: 1000,
    },
    // 부산 해운대 마라톤 쿠폰
    {
      eventId: event4.id,
      name: '해산물집 15,000원 할인',
      category: 'RESTAURANT' as const,
      type: 'DISCOUNT_10000' as const,
      discountAmount: 15000,
      description: '해운대 해산물집에서 사용 가능',
      maxIssueCount: 400,
    },
  ];

  for (const template of couponTemplates) {
    // 같은 이름의 템플릿이 이미 있는지 확인
    const existing = await prisma.couponTemplate.findFirst({
      where: {
        eventId: template.eventId,
        name: template.name,
      },
    });

    if (!existing) {
      await prisma.couponTemplate.create({ data: template });
    }
  }
  console.log('✅ Coupon templates created:', couponTemplates.length);

  // 7. 교환권 템플릿 생성 (축제용)
  const rewardTemplates = [
    // 춘천마라톤 교환권
    {
      eventId: event1.id,
      name: '베이직 기념품',
      tier: 'TIER_3' as const,
      requiredStamps: 3,
      description: '스탬프 3개 달성 기념품',
      totalQuantity: 500,
      remainingQuantity: 500,
    },
    {
      eventId: event1.id,
      name: '스탠다드 기념품',
      tier: 'TIER_5' as const,
      requiredStamps: 5,
      description: '스탬프 5개 달성 기념품',
      totalQuantity: 300,
      remainingQuantity: 300,
    },
    {
      eventId: event1.id,
      name: '프리미엄 기념품',
      tier: 'TIER_10' as const,
      requiredStamps: 10,
      description: '스탬프 10개 달성 기념품',
      totalQuantity: 100,
      remainingQuantity: 100,
    },
    // 서울 봄축제 교환권
    {
      eventId: event3.id,
      name: '서울 봄축제 기념품 세트',
      tier: 'TIER_5' as const,
      requiredStamps: 5,
      description: '서울 봄축제 기념품 세트',
      totalQuantity: 200,
      remainingQuantity: 200,
    },
    {
      eventId: event3.id,
      name: '프리미엄 서울 기념품',
      tier: 'TIER_10' as const,
      requiredStamps: 10,
      description: '서울 봄축제 프리미엄 기념품',
      totalQuantity: 50,
      remainingQuantity: 50,
    },
  ];

  for (const template of rewardTemplates) {
    // 같은 이름의 템플릿이 이미 있는지 확인
    const existing = await prisma.rewardTemplate.findFirst({
      where: {
        eventId: template.eventId,
        name: template.name,
      },
    });

    if (!existing) {
      await prisma.rewardTemplate.create({ data: template });
    }
  }
  console.log('✅ Reward templates created:', rewardTemplates.length);

  console.log('');
  console.log('🎉 Seeding completed!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`   Events: ${createdEvents.length}`);
  console.log(`   Merchants: ${createdMerchants.length}`);
  console.log(`   Posts: ${posts.length}`);
  console.log(`   Coupon Templates: ${couponTemplates.length}`);
  console.log(`   Reward Templates: ${rewardTemplates.length}`);
  console.log('');
  console.log('📋 Test Accounts:');
  console.log('   Admin: admin@eatsrun.kr / admin1234');
  console.log('   Merchants:');
  merchants.forEach((m, i) => {
    console.log(`     ${i + 1}. ${m.email} / store1234`);
  });
  console.log('');
  console.log('🎯 Test Events:');
  createdEvents.forEach((e) => {
    console.log(`   - ${e.name} (${e.type}) - ${e.status}`);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
