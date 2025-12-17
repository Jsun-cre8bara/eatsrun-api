import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser } from '../middlewares/auth.middleware';
import userService from '../services/user.service';
import { sendSuccess } from '../utils/response';

const router = Router();

// GET /users/me - 내 정보 조회
router.get('/me', authenticateUser, async (req: Request, res: Response) => {
  const user = await userService.getMe(req.user!.userId);
  sendSuccess(res, user);
});

// PATCH /users/me - 내 정보 수정
router.patch(
  '/me',
  authenticateUser,
  validate([
    body('name').optional().isString(),
    body('phone').optional().isString(),
  ]),
  async (req: Request, res: Response) => {
    const { name, phone } = req.body;
    const user = await userService.updateMe(req.user!.userId, { name, phone });
    sendSuccess(res, user);
  }
);

// PUT /users/me/fcm-token - FCM 토큰 등록
router.put(
  '/me/fcm-token',
  authenticateUser,
  validate([
    body('fcm_token').notEmpty().withMessage('FCM token is required'),
  ]),
  async (req: Request, res: Response) => {
    const { fcm_token } = req.body;
    const result = await userService.updateFcmToken(req.user!.userId, fcm_token);
    sendSuccess(res, result);
  }
);

// DELETE /users/me - 회원 탈퇴
router.delete('/me', authenticateUser, async (req: Request, res: Response) => {
  const result = await userService.deleteAccount(req.user!.userId);
  sendSuccess(res, result);
});

// GET /users/me/events - 내 참여 행사 목록
router.get('/me/events', authenticateUser, async (req: Request, res: Response) => {
  const events = await userService.getMyEvents(req.user!.userId);
  sendSuccess(res, events);
});

export default router;
