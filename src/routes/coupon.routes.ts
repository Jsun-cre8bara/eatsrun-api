import { Router, Request, Response } from 'express';
import { body, query, param } from 'express-validator';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser, authenticateMerchant } from '../middlewares/auth.middleware';
import couponService from '../services/coupon.service';
import { sendSuccess } from '../utils/response';
import { CouponStatus, MerchantCategory } from '@prisma/client';

const router = Router();

// GET /coupons - 내 쿠폰 목록
router.get(
  '/',
  authenticateUser,
  async (req: Request, res: Response) => {
    const { event_id, status, category } = req.query;
    
    const coupons = await couponService.getCoupons({
      userId: req.user!.userId,
      eventId: event_id as string | undefined,
      status: status as CouponStatus | undefined,
      category: category as MerchantCategory | undefined,
    });
    
    sendSuccess(res, coupons);
  }
);

// GET /coupons/:id - 쿠폰 상세 조회
router.get(
  '/:id',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid coupon ID'),
  ]),
  async (req: Request, res: Response) => {
    const coupon = await couponService.getCouponById(req.user!.userId, req.params.id);
    sendSuccess(res, coupon);
  }
);

// GET /coupons/:id/qr - 쿠폰 QR 코드
router.get(
  '/:id/qr',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid coupon ID'),
  ]),
  async (req: Request, res: Response) => {
    const qrData = await couponService.getCouponQR(req.user!.userId, req.params.id);
    sendSuccess(res, qrData);
  }
);

// POST /coupons/validate - [상점용] 쿠폰 검증
router.post(
  '/validate',
  authenticateMerchant,
  validate([
    body('qr_code').notEmpty().withMessage('QR code is required'),
  ]),
  async (req: Request, res: Response) => {
    const { qr_code } = req.body;
    const result = await couponService.validateCoupon(req.merchantUser!.merchantId, qr_code);
    sendSuccess(res, result);
  }
);

// POST /coupons/:id/use - [상점용] 쿠폰 사용 처리
router.post(
  '/:id/use',
  authenticateMerchant,
  validate([
    param('id').isUUID().withMessage('Invalid coupon ID'),
  ]),
  async (req: Request, res: Response) => {
    const result = await couponService.useCoupon(req.merchantUser!.merchantId, req.params.id);
    sendSuccess(res, result);
  }
);

export default router;
