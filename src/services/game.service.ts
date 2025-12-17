import prisma from '../utils/prisma';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { GameType, MerchantCategory, CouponType } from '@prisma/client';

export class GameService {
  // 게임 플레이 (결과 생성)
  async playGame(
    userId: string,
    gameId: string, // postVisitId
    gameType: GameType
  ) {
    // 방문 기록 확인
    const postVisit = await prisma.postVisit.findUnique({
      where: { id: gameId },
      include: {
        post: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!postVisit) {
      throw new NotFoundError('Game session not found');
    }

    if (postVisit.userId !== userId) {
      throw new BadRequestError('Invalid game session');
    }

    // 이미 게임을 플레이했는지 확인
    const existingGame = await prisma.gameLog.findFirst({
      where: { postVisitId: gameId },
    });

    if (existingGame) {
      throw new ConflictError('Game already played');
    }

    // 사용 가능한 카테고리 조회
    const availableCategories = await prisma.eventMerchant.findMany({
      where: { 
        eventId: postVisit.eventId, 
        isActive: true,
      },
      select: {
        merchant: {
          select: { category: true },
        },
      },
      distinct: ['merchantId'],
    });

    const categories = [...new Set(availableCategories.map(em => em.merchant.category))];
    
    if (categories.length === 0) {
      throw new BadRequestError('No available categories');
    }

    // 랜덤 카테고리 선택
    const resultCategory = categories[Math.floor(Math.random() * categories.length)];

    // 애니메이션 데이터 생성
    let animationData: any = { type: gameType };

    switch (gameType) {
      case 'ROULETTE':
        animationData.finalAngle = Math.random() * 360 + 1800; // 5바퀴 + α
        animationData.duration = 4000;
        break;
      case 'LADDER':
        animationData.selectedLadder = Math.floor(Math.random() * 4);
        animationData.duration = 3000;
        break;
      case 'CAPSULE':
        animationData.capsuleIndex = Math.floor(Math.random() * 6);
        animationData.duration = 2000;
        break;
      case 'CARD':
        animationData.cardIndex = Math.floor(Math.random() * 4);
        animationData.duration = 1500;
        break;
      case 'SLOT':
        animationData.slots = [
          Math.floor(Math.random() * 5),
          Math.floor(Math.random() * 5),
          Math.floor(Math.random() * 5),
        ];
        animationData.duration = 3500;
        break;
    }

    // 결과를 임시 저장 (실제로는 Redis 등 사용)
    // 여기서는 바로 반환하고 select-category에서 처리

    return {
      resultCategory,
      animationData,
    };
  }

  // 카테고리 선택 및 쿠폰 발급
  async selectCategory(
    userId: string,
    gameId: string, // postVisitId
    category: MerchantCategory
  ) {
    // 방문 기록 확인
    const postVisit = await prisma.postVisit.findUnique({
      where: { id: gameId },
      include: {
        post: {
          include: {
            event: true,
          },
        },
      },
    });

    if (!postVisit) {
      throw new NotFoundError('Game session not found');
    }

    if (postVisit.userId !== userId) {
      throw new BadRequestError('Invalid game session');
    }

    // 이미 쿠폰을 받았는지 확인
    const existingGame = await prisma.gameLog.findFirst({
      where: { postVisitId: gameId },
    });

    if (existingGame) {
      throw new ConflictError('Coupon already issued for this visit');
    }

    // 해당 카테고리의 쿠폰 템플릿 조회
    const template = await prisma.couponTemplate.findFirst({
      where: {
        eventId: postVisit.eventId,
        category,
        isActive: true,
        OR: [
          { maxIssueCount: null },
          { maxIssueCount: { gt: prisma.couponTemplate.fields.issuedCount } },
        ],
      },
    });

    if (!template) {
      throw new BadRequestError('No coupon template available for this category');
    }

    // 쿠폰 유효기간 계산
    const event = postVisit.post.event;
    const validFrom = new Date();
    validFrom.setHours(0, 0, 0, 0);
    
    const validUntil = new Date(event.endDate);
    const [hours, minutes] = event.couponEndTime.split(':').map(Number);
    validUntil.setHours(hours, minutes, 0, 0);

    // 쿠폰 발급
    const coupon = await prisma.coupon.create({
      data: {
        userId,
        eventId: postVisit.eventId,
        templateId: template.id,
        category,
        type: template.type,
        discountAmount: template.discountAmount,
        validFrom,
        validUntil,
      },
    });

    // 템플릿 발급 수 증가
    await prisma.couponTemplate.update({
      where: { id: template.id },
      data: { issuedCount: { increment: 1 } },
    });

    // 게임 로그 기록
    await prisma.gameLog.create({
      data: {
        userId,
        eventId: postVisit.eventId,
        postVisitId: gameId,
        gameType: 'ROULETTE', // 실제로는 플레이한 게임 타입
        resultCategory: category,
        couponId: coupon.id,
      },
    });

    // 사용 가능한 상점 목록
    const availableMerchants = await prisma.eventMerchant.findMany({
      where: {
        eventId: postVisit.eventId,
        isActive: true,
        merchant: {
          category,
          status: 'APPROVED',
        },
      },
      select: {
        merchant: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return {
      coupon: {
        id: coupon.id,
        category: coupon.category,
        type: coupon.type,
        discountAmount: coupon.discountAmount,
        qrCode: coupon.qrCode,
        validFrom: coupon.validFrom,
        validUntil: coupon.validUntil,
        availableMerchants: availableMerchants.map(em => em.merchant),
      },
    };
  }
}

export default new GameService();
