import { Router, Request, Response } from 'express';
import { body, query } from 'express-validator';
import { validate } from '../middlewares/validate.middleware';
import { authenticateMerchant } from '../middlewares/auth.middleware';
import merchantService from '../services/merchant.service';
import { sendSuccess } from '../utils/response';
import { MerchantCategory } from '@prisma/client';

const router = Router();

// POST /merchants/register - 상점 가입 신청
router.post(
  '/register',
  validate([
    body('store_name').notEmpty().withMessage('Store name is required'),
    body('category').isIn(['RESTAURANT', 'CAFE', 'PERFORMANCE', 'ACCOMMODATION', 'OTHER']),
    body('address').notEmpty().withMessage('Address is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('business_number').notEmpty().withMessage('Business number is required'),
    body('owner_name').notEmpty().withMessage('Owner name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ]),
  async (req: Request, res: Response) => {
    const result = await merchantService.register({
      storeName: req.body.store_name,
      category: req.body.category as MerchantCategory,
      address: req.body.address,
      phone: req.body.phone,
      businessNumber: req.body.business_number,
      ownerName: req.body.owner_name,
      email: req.body.email,
      password: req.body.password,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
    });
    sendSuccess(res, result, 201);
  }
);

// POST /merchants/auth/login - 상점주 로그인
router.post(
  '/auth/login',
  validate([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;
    const result = await merchantService.login(email, password);
    sendSuccess(res, result);
  }
);

// GET /merchants/me - 내 상점 정보
router.get('/me', authenticateMerchant, async (req: Request, res: Response) => {
  const merchant = await merchantService.getMyMerchant(req.merchantUser!.merchantId);
  sendSuccess(res, merchant);
});

// GET /merchants/me/dashboard - 대시보드
router.get('/me/dashboard', authenticateMerchant, async (req: Request, res: Response) => {
  const dashboard = await merchantService.getDashboard(req.merchantUser!.merchantId);
  sendSuccess(res, dashboard);
});

// GET /merchants/me/coupons - 쿠폰 사용 내역
router.get('/me/coupons', authenticateMerchant, async (req: Request, res: Response) => {
  const { event_id } = req.query;
  const history = await merchantService.getCouponHistory(
    req.merchantUser!.merchantId,
    event_id as string | undefined
  );
  sendSuccess(res, history);
});

// GET /merchants/me/settlements - 정산 내역
router.get('/me/settlements', authenticateMerchant, async (req: Request, res: Response) => {
  const { event_id } = req.query;
  const settlements = await merchantService.getSettlements(
    req.merchantUser!.merchantId,
    event_id as string | undefined
  );
  sendSuccess(res, settlements);
});

export default router;
