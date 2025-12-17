import bcrypt from 'bcryptjs';
import prisma from '../utils/prisma';
import { generateMerchantAccessToken, generateMerchantRefreshToken } from '../utils/jwt';
import { NotFoundError, BadRequestError, UnauthorizedError, ConflictError } from '../utils/errors';
import { MerchantCategory, MerchantStatus } from '@prisma/client';

interface RegisterMerchantInput {
  storeName: string;
  category: MerchantCategory;
  address: string;
  phone: string;
  businessNumber: string;
  ownerName: string;
  email: string;
  password: string;
  latitude?: number;
  longitude?: number;
}

export class MerchantService {
  // 상점 가입 신청
  async register(input: RegisterMerchantInput) {
    // 이메일 중복 확인
    const existingUser = await prisma.merchantUser.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // 사업자번호 중복 확인
    const existingMerchant = await prisma.merchant.findFirst({
      where: { businessNumber: input.businessNumber },
    });

    if (existingMerchant) {
      throw new ConflictError('Business number already registered');
    }

    // 비밀번호 해시
    const passwordHash = await bcrypt.hash(input.password, 10);

    // 상점 및 관리자 계정 생성
    const merchant = await prisma.merchant.create({
      data: {
        name: input.storeName,
        category: input.category,
        address: input.address,
        phone: input.phone,
        businessNumber: input.businessNumber,
        latitude: input.latitude || 0,
        longitude: input.longitude || 0,
        status: 'PENDING',
        merchantUsers: {
          create: {
            email: input.email,
            passwordHash,
            name: input.ownerName,
            phone: input.phone,
            role: 'OWNER',
          },
        },
      },
    });

    return {
      merchantId: merchant.id,
      status: merchant.status,
      message: '가입 신청이 완료되었습니다. 1-2 영업일 내 승인됩니다.',
    };
  }

  // 상점주 로그인
  async login(email: string, password: string) {
    const merchantUser = await prisma.merchantUser.findUnique({
      where: { email },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!merchantUser) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, merchantUser.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (merchantUser.merchant.status !== 'APPROVED') {
      throw new BadRequestError(`Merchant status: ${merchantUser.merchant.status}`);
    }

    // 마지막 로그인 시간 업데이트
    await prisma.merchantUser.update({
      where: { id: merchantUser.id },
      data: { lastLoginAt: new Date() },
    });

    // 토큰 생성
    const accessToken = generateMerchantAccessToken(merchantUser.id, merchantUser.merchantId);
    const refreshToken = generateMerchantRefreshToken(merchantUser.id, merchantUser.merchantId);

    return {
      accessToken,
      refreshToken,
      merchant: {
        id: merchantUser.merchant.id,
        name: merchantUser.merchant.name,
      },
      user: {
        id: merchantUser.id,
        name: merchantUser.name,
        role: merchantUser.role,
      },
    };
  }

  // 내 상점 정보 조회
  async getMyMerchant(merchantId: string) {
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        eventMerchants: {
          where: { isActive: true },
          include: {
            event: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundError('Merchant not found');
    }

    return {
      id: merchant.id,
      name: merchant.name,
      category: merchant.category,
      address: merchant.address,
      phone: merchant.phone,
      status: merchant.status,
      isPostMerchant: merchant.isPostMerchant,
      activeEvents: merchant.eventMerchants.map(em => em.event),
    };
  }

  // 대시보드 데이터
  async getDashboard(merchantId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 오늘 쿠폰 사용 통계
    const todayCoupons = await prisma.coupon.findMany({
      where: {
        merchantId,
        status: 'USED',
        usedAt: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const todayStats = {
      couponUsed: todayCoupons.length,
      totalDiscount: todayCoupons.reduce((sum, c) => sum + c.discountAmount, 0),
      visitors: new Set(todayCoupons.map(c => c.userId)).size,
    };

    // 최근 사용 내역
    const recentUsage = await prisma.coupon.findMany({
      where: {
        merchantId,
        status: 'USED',
      },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { usedAt: 'desc' },
      take: 5,
    });

    // 활성 행사
    const activeEvent = await prisma.eventMerchant.findFirst({
      where: {
        merchantId,
        isActive: true,
        event: { status: 'ACTIVE' },
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    // 정산 대기 금액
    const pendingSettlement = await prisma.settlement.aggregate({
      where: {
        merchantId,
        status: 'PENDING',
      },
      _sum: {
        settlementAmount: true,
      },
    });

    return {
      today: todayStats,
      event: activeEvent?.event || null,
      recentUsage: recentUsage.map(c => ({
        time: c.usedAt?.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        type: c.type,
        customerName: c.user.name ? c.user.name[0] + '***' : '고객',
      })),
      pendingSettlement: pendingSettlement._sum.settlementAmount || 0,
    };
  }

  // 쿠폰 사용 내역
  async getCouponHistory(merchantId: string, eventId?: string) {
    const coupons = await prisma.coupon.findMany({
      where: {
        merchantId,
        status: 'USED',
        ...(eventId && { eventId }),
      },
      include: {
        user: {
          select: { name: true },
        },
        event: {
          select: { name: true },
        },
      },
      orderBy: { usedAt: 'desc' },
    });

    return coupons.map(c => ({
      id: c.id,
      type: c.type,
      discountAmount: c.discountAmount,
      usedAt: c.usedAt,
      customerName: c.user.name ? c.user.name[0] + '***' : '고객',
      eventName: c.event.name,
    }));
  }

  // 정산 내역
  async getSettlements(merchantId: string, eventId?: string) {
    const settlements = await prisma.settlement.findMany({
      where: {
        merchantId,
        ...(eventId && { eventId }),
      },
      include: {
        event: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return settlements.map(s => ({
      id: s.id,
      eventName: s.event.name,
      period: `${s.periodStart.toISOString().split('T')[0]} ~ ${s.periodEnd.toISOString().split('T')[0]}`,
      totalCoupons: s.totalCoupons,
      totalAmount: s.totalDiscountAmount,
      commission: s.commissionAmount,
      settlementAmount: s.settlementAmount,
      status: s.status,
      completedAt: s.completedAt,
    }));
  }
}

export default new MerchantService();
