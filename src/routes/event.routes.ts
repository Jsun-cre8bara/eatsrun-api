import { Router, Request, Response } from 'express';
import { body, query, param } from 'express-validator';
import { validate } from '../middlewares/validate.middleware';
import { authenticateUser } from '../middlewares/auth.middleware';
import eventService from '../services/event.service';
import postService from '../services/post.service';
import { sendSuccess, sendPaginated } from '../utils/response';
import { EventStatus, EventType, UserType } from '@prisma/client';

const router = Router();

// POST /events - 행사 등록
router.post(
  '/',
  authenticateUser,
  validate([
    body('name').notEmpty().withMessage('Event name is required'),
    body('type').isIn(['RUNNING', 'FESTIVAL', 'SINGLE']).withMessage('Invalid event type'),
    body('region').notEmpty().withMessage('Region is required'),
    body('startDate').isISO8601().withMessage('Invalid start date format'),
    body('endDate').isISO8601().withMessage('Invalid end date format'),
    body('description').optional().isString(),
    body('imageUrl').optional().isURL().withMessage('Invalid image URL'),
  ]),
  async (req: Request, res: Response) => {
    const { name, type, region, startDate, endDate, description, imageUrl } = req.body;
    
    const event = await eventService.createEvent({
      name,
      type: type as EventType,
      region,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      description,
      imageUrl,
    });
    
    sendSuccess(res, event, 201);
  }
);

// GET /events - 행사 목록 조회
router.get(
  '/',
  authenticateUser,
  async (req: Request, res: Response) => {
    const { status, type, region, page = '1', limit = '20' } = req.query;
    
    const result = await eventService.getEvents({
      status: status as EventStatus | undefined,
      type: type as EventType | undefined,
      region: region as string | undefined,
      page: parseInt(page as string),
      limit: parseInt(limit as string),
    });

    sendPaginated(res, result.items, result.page, result.limit, result.total);
  }
);

// GET /events/:id - 행사 상세 조회
router.get(
  '/:id',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid event ID'),
  ]),
  async (req: Request, res: Response) => {
    const event = await eventService.getEventById(req.params.id);
    sendSuccess(res, event);
  }
);

// POST /events/:id/join - 행사 참여
router.post(
  '/:id/join',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid event ID'),
    body('user_type').isIn(['RUNNER', 'VISITOR', 'PARTICIPANT']).withMessage('Invalid user type'),
  ]),
  async (req: Request, res: Response) => {
    const { user_type } = req.body;
    const result = await eventService.joinEvent(
      req.user!.userId,
      req.params.id,
      user_type as UserType
    );
    sendSuccess(res, result, 201);
  }
);

// GET /events/:id/posts - 행사의 포스트 목록 조회
router.get(
  '/:id/posts',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid event ID'),
  ]),
  async (req: Request, res: Response) => {
    const posts = await postService.getPosts({
      eventId: req.params.id,
      userId: req.user!.userId,
    });
    sendSuccess(res, posts);
  }
);

// GET /events/:id/my-status - 내 참여 현황
router.get(
  '/:id/my-status',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid event ID'),
  ]),
  async (req: Request, res: Response) => {
    const status = await eventService.getMyEventStatus(req.user!.userId, req.params.id);
    sendSuccess(res, status);
  }
);

// POST /events/:id/finish - 완주 인증
router.post(
  '/:id/finish',
  authenticateUser,
  validate([
    param('id').isUUID().withMessage('Invalid event ID'),
    body('finish_code').notEmpty().withMessage('Finish code is required'),
  ]),
  async (req: Request, res: Response) => {
    const { finish_code } = req.body;
    const result = await eventService.verifyFinish(req.user!.userId, req.params.id, finish_code);
    sendSuccess(res, result);
  }
);

export default router;
