import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser } from '../middlewares/auth.middleware';
import stampService from '../services/stamp.service';
import { sendSuccess } from '../utils/response';

const router = Router();

// 행사 라우터에서 사용하는 스탬프 엔드포인트들
// /events/:eventId/stamps, /events/:eventId/rewards 형태로 접근

// GET /stamps/:eventId - 스탬프 현황
router.get(
  '/:eventId',
  authenticateUser,
  validate([
    param('eventId').isUUID().withMessage('Invalid event ID'),
  ]),
  async (req: Request, res: Response) => {
    const stamps = await stampService.getStamps(req.user!.userId, req.params.eventId);
    sendSuccess(res, stamps);
  }
);

// GET /stamps/:eventId/rewards - 교환권 목록
router.get(
  '/:eventId/rewards',
  authenticateUser,
  validate([
    param('eventId').isUUID().withMessage('Invalid event ID'),
  ]),
  async (req: Request, res: Response) => {
    const rewards = await stampService.getRewards(req.user!.userId, req.params.eventId);
    sendSuccess(res, rewards);
  }
);

// POST /stamps/rewards/:id/claim - 교환권 획득
router.post(
  '/rewards/:id/claim',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid template ID'),
  ]),
  async (req: Request, res: Response) => {
    const result = await stampService.claimReward(req.user!.userId, req.params.id);
    sendSuccess(res, result, 201);
  }
);

// POST /stamps/rewards/:id/redeem - 교환권 사용
router.post(
  '/rewards/:id/redeem',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid reward ID'),
    body('post_id').isUUID().withMessage('Post ID is required'),
  ]),
  async (req: Request, res: Response) => {
    const { post_id } = req.body;
    const result = await stampService.redeemReward(req.user!.userId, req.params.id, post_id);
    sendSuccess(res, result);
  }
);

export default router;
