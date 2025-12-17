import { Router, Request, Response } from 'express';
import { body, query, param } from 'express-validator';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser } from '../middlewares/auth.middleware';
import postService from '../services/post.service';
import { sendSuccess } from '../utils/response';
import { PostCategory } from '@prisma/client';

const router = Router();

// POST /posts - 포스트 생성
router.post(
  '/',
  authenticateUser,
  validate([
    body('event_id').isUUID().withMessage('Event ID is required'),
    body('name').notEmpty().withMessage('Post name is required'),
    body('category').isIn(['TOURIST', 'BOOTH', 'PERFORMANCE', 'RESTAURANT', 'CAFE', 'ACCOMMODATION', 'OTHER']).withMessage('Invalid category'),
    body('address').notEmpty().withMessage('Address is required'),
    body('latitude').isFloat().withMessage('Latitude is required'),
    body('longitude').isFloat().withMessage('Longitude is required'),
    body('description').optional().isString(),
    body('imageUrl').optional().isURL().withMessage('Invalid image URL'),
    body('isRewardPost').optional().isBoolean(),
    body('merchantId').optional().isUUID(),
  ]),
  async (req: Request, res: Response) => {
    const { event_id, name, category, description, imageUrl, address, latitude, longitude, isRewardPost, operatingHours, merchantId } = req.body;
    
    const post = await postService.createPost(event_id, {
      name,
      category: category as PostCategory,
      description,
      imageUrl,
      address,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      isRewardPost,
      operatingHours,
      merchantId,
    });
    
    sendSuccess(res, post, 201);
  }
);

// GET /posts/nearby - 근처 포스트 조회
router.get(
  '/nearby',
  authenticateUser,
  validate([
    query('event_id').isUUID().withMessage('Event ID is required'),
    query('latitude').isFloat().withMessage('Latitude is required'),
    query('longitude').isFloat().withMessage('Longitude is required'),
    query('radius_km').optional().isFloat({ min: 0.1, max: 10 }),
  ]),
  async (req: Request, res: Response) => {
    const { event_id, latitude, longitude, radius_km = '1' } = req.query;
    
    const posts = await postService.getNearbyPosts(
      event_id as string,
      parseFloat(latitude as string),
      parseFloat(longitude as string),
      parseFloat(radius_km as string)
    );
    
    sendSuccess(res, posts);
  }
);

// GET /posts/:id - 포스트 상세 조회
router.get(
  '/:id',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid post ID'),
  ]),
  async (req: Request, res: Response) => {
    const post = await postService.getPostById(req.params.id, req.user!.userId);
    sendSuccess(res, post);
  }
);

// POST /posts/:id/visit - 포스트 방문 (QR 스캔)
router.post(
  '/:id/visit',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid post ID'),
    body('qr_code').notEmpty().withMessage('QR code is required'),
    body('latitude').optional().isFloat(),
    body('longitude').optional().isFloat(),
  ]),
  async (req: Request, res: Response) => {
    const { qr_code, latitude, longitude } = req.body;
    
    const location = latitude && longitude 
      ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
      : undefined;
    
    const result = await postService.visitPost(
      req.user!.userId,
      req.params.id,
      qr_code,
      location
    );
    
    sendSuccess(res, result, 201);
  }
);

export default router;
