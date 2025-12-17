import { Router, Request, Response } from 'express';
import { body } from 'express-validator';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser } from '../middlewares/auth.middleware';
import authService from '../services/auth.service';
import { sendSuccess } from '../utils/response';

const router = Router();

// POST /auth/social - 소셜 로그인
router.post(
  '/social',
  validate([
    body('provider').isIn(['kakao', 'naver']).withMessage('Provider must be kakao or naver'),
    body('access_token').notEmpty().withMessage('Access token is required'),
  ]),
  async (req: Request, res: Response) => {
    const { provider, access_token } = req.body;
    const result = await authService.socialLogin(provider, access_token);
    sendSuccess(res, result);
  }
);

// POST /auth/refresh - 토큰 갱신
router.post(
  '/refresh',
  validate([
    body('refresh_token').notEmpty().withMessage('Refresh token is required'),
  ]),
  async (req: Request, res: Response) => {
    const { refresh_token } = req.body;
    const result = await authService.refreshToken(refresh_token);
    sendSuccess(res, result);
  }
);

// POST /auth/verify-runner - 러너 본인 인증
router.post(
  '/verify-runner',
  authenticateUser,
  validate([
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
  ]),
  async (req: Request, res: Response) => {
    const { name, phone, event_id } = req.body;
    const result = await authService.verifyRunner(req.user!.userId, name, phone, event_id);
    sendSuccess(res, result);
  }
);

// POST /auth/logout - 로그아웃 (클라이언트에서 토큰 삭제)
router.post('/logout', authenticateUser, async (req: Request, res: Response) => {
  // 실제로는 토큰 블랙리스트에 추가하거나 refresh token 무효화
  sendSuccess(res, { message: 'Logged out successfully' });
});

export default router;
