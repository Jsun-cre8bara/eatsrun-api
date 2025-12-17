import { Router, Request, Response } from 'express';
import { body, param } from 'express-validator';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser } from '../middlewares/auth.middleware';
import gameService from '../services/game.service';
import { sendSuccess } from '../utils/response';
import { GameType, MerchantCategory } from '@prisma/client';

const router = Router();

// POST /games/:id/play - 게임 플레이
router.post(
  '/:id/play',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid game ID'),
    body('game_type').isIn(['ROULETTE', 'LADDER', 'CAPSULE', 'CARD', 'SLOT']).withMessage('Invalid game type'),
  ]),
  async (req: Request, res: Response) => {
    const { game_type } = req.body;
    
    const result = await gameService.playGame(
      req.user!.userId,
      req.params.id,
      game_type as GameType
    );
    
    sendSuccess(res, result);
  }
);

// POST /games/:id/select-category - 카테고리 선택 및 쿠폰 발급
router.post(
  '/:id/select-category',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid game ID'),
    body('category').isIn(['RESTAURANT', 'CAFE', 'PERFORMANCE', 'ACCOMMODATION', 'OTHER']).withMessage('Invalid category'),
  ]),
  async (req: Request, res: Response) => {
    const { category } = req.body;
    
    const result = await gameService.selectCategory(
      req.user!.userId,
      req.params.id,
      category as MerchantCategory
    );
    
    sendSuccess(res, result, 201);
  }
);

export default router;
