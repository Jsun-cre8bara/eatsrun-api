import prisma from '../utils/prisma';
import { NotFoundError, BadRequestError, ConflictError, ForbiddenError } from '../utils/errors';
import { CouponStatus, MerchantCategory } from '@prisma/client';

interface GetCouponsParams {
  userId: string;
  eventId?: string;
  status?: CouponStatus;
  category?: MerchantCategory;
}

export class CouponService {
  // 쿠폰 목록 조회
  async getCoupons(params: GetCouponsParams) {
    const { userId, eventId, status, category } = params;

    const coupons = await prisma.coupon.findMany({
      where: {
        userId,
        ...(eventId && { eventId }),
        ...(status && { status }),
        ...(category && { category }),
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        template: {
          select: {
            name: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 각 쿠폰별 사용 가능 상점 수 조회
    const results = await Promise.all(
      coupons.map(async (coupon) => {
        const merchantCount = await prisma.eventMerchant.count({
          where: {
            eventId: coupon.eventId,
            isActive: true,
            merchant: {
              category: coupon.category,
              status: 'APPROVED',
            },
          },
        });

        return {
          id: coupon.id,
          category: coupon.category,
          type: coupon.type,
          discountAmount: coupon.discountAmount,
          status: coupon.status,
          validFrom: coupon.validFrom,
          validUntil: coupon.validUntil,
          usedAt: coupon.usedAt,
          event: coupon.event,
          name: coupon.template.name,
          description: coupon.template.description,
          merchantCount,
        };
      })
    );

    return results;
  }

  // 쿠폰 상세 조회
  async getCouponById(userId: string, couponId: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
          },
        },
        template: {
          select: {
            name: true,
            description: true,
          },
        },
        merchant: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    if (coupon.userId !== userId) {
      throw new ForbiddenError('Not your coupon');
    }

    // 사용 가능 상점 목록
    const availableMerchants = await prisma.eventMerchant.findMany({
      where: {
        eventId: coupon.eventId,
        isActive: true,
        merchant: {
          category: coupon.category,
          status: 'APPROVED',
        },
      },
      select: {
        merchant: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    return {
      id: coupon.id,
      category: coupon.category,
      type: coupon.type,
      discountAmount: coupon.discountAmount,
      qrCode: coupon.qrCode,
      status: coupon.status,
      validFrom: coupon.validFrom,
      validUntil: coupon.validUntil,
      usedAt: coupon.usedAt,
      event: coupon.event,
      name: coupon.template.name,
      description: coupon.template.description,
      usedAtMerchant: coupon.merchant,
      availableMerchants: availableMerchants.map(em => ({
        ...em.merchant,
        latitude: Number(em.merchant.latitude),
        longitude: Number(em.merchant.longitude),
      })),
    };
  }

  // 쿠폰 QR 코드 조회
  async getCouponQR(userId: string, couponId: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
      select: {
        id: true,
        userId: true,
        qrCode: true,
        status: true,
        validUntil: true,
      },
    });

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    if (coupon.userId !== userId) {
      throw new ForbiddenError('Not your coupon');
    }

    if (coupon.status !== 'ACTIVE') {
      throw new BadRequestError('Coupon is not active');
    }

    if (new Date() > coupon.validUntil) {
      throw new BadRequestError('Coupon has expired');
    }

    return {
      couponId: coupon.id,
      qrCode: coupon.qrCode,
      validUntil: coupon.validUntil,
    };
  }

  // [상점용] 쿠폰 검증
  async validateCoupon(merchantId: string, qrCode: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { qrCode },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        template: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!coupon) {
      return { valid: false, reason: 'Coupon not found' };
    }

    if (coupon.status !== 'ACTIVE') {
      return { valid: false, reason: 'Coupon already used or expired' };
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      return { valid: false, reason: 'Coupon not valid at this time' };
    }

    // 상점 카테고리 확인
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { category: true },
    });

    if (!merchant || merchant.category !== coupon.category) {
      return { valid: false, reason: 'Coupon not valid for this merchant category' };
    }

    // 상점이 해당 행사에 참여중인지 확인
    const eventMerchant = await prisma.eventMerchant.findUnique({
      where: {
        eventId_merchantId: {
          eventId: coupon.eventId,
          merchantId,
        },
      },
    });

    if (!eventMerchant || !eventMerchant.isActive) {
      return { valid: false, reason: 'Merchant not participating in this event' };
    }

    // 사용자 이름 마스킹
    const userName = coupon.user.name || '고객';
    const maskedName = userName.length > 1 
      ? userName[0] + '***' + (userName.length > 2 ? userName[userName.length - 1] : '')
      : userName + '***';

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        category: coupon.category,
        type: coupon.type,
        discountAmount: coupon.discountAmount,
        name: coupon.template.name,
        userName: maskedName,
        validUntil: coupon.validUntil,
      },
    };
  }

  // [상점용] 쿠폰 사용 처리
  async useCoupon(merchantId: string, couponId: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { id: couponId },
    });

    if (!coupon) {
      throw new NotFoundError('Coupon not found');
    }

    if (coupon.status !== 'ACTIVE') {
      throw new BadRequestError('Coupon is not active');
    }

    const now = new Date();
    if (now < coupon.validFrom || now > coupon.validUntil) {
      throw new BadRequestError('Coupon not valid at this time');
    }

    // 상점 카테고리 확인
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { category: true },
    });

    if (!merchant || merchant.category !== coupon.category) {
      throw new BadRequestError('Coupon not valid for this merchant category');
    }

    // 쿠폰 사용 처리
    const updatedCoupon = await prisma.coupon.update({
      where: { id: couponId },
      data: {
        status: 'USED',
        merchantId,
        usedAt: now,
      },
    });

    return {
      success: true,
      usedAt: updatedCoupon.usedAt,
      discountAmount: updatedCoupon.discountAmount,
    };
  }

  // 만료된 쿠폰 상태 업데이트 (배치 작업용)
  async expireCoupons() {
    const now = new Date();
    
    const result = await prisma.coupon.updateMany({
      where: {
        status: 'ACTIVE',
        validUntil: { lt: now },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return { expiredCount: result.count };
  }
}

export default new CouponService();
