import { Router, Request, Response } from 'express';
import { body, param, query } from 'express-validator';
import bcrypt from 'bcryptjs';
import { validate } from '../middlewares/validate.middleware';
import { authenticateAdmin, requireAdminRole } from '../middlewares/auth.middleware';
import { generateAdminAccessToken, generateAdminRefreshToken } from '../utils/jwt';
import prisma from '../utils/prisma';
import { sendSuccess, sendPaginated } from '../utils/response';
import { NotFoundError, UnauthorizedError, BadRequestError } from '../utils/errors';

const router = Router();

// ==================== AUTH ====================

// POST /admin/auth/login
router.post(
  '/auth/login',
  validate([
    body('email').isEmail(),
    body('password').notEmpty(),
  ]),
  async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    await prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = generateAdminAccessToken(admin.id, admin.role);
    const refreshToken = generateAdminRefreshToken(admin.id, admin.role);

    sendSuccess(res, {
      accessToken,
      refreshToken,
      admin: { id: admin.id, name: admin.name, role: admin.role },
    });
  }
);

// ==================== EVENTS ====================

// GET /admin/events
router.get(
  '/events',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    const { status, type, page = '1', limit = '20' } = req.query;

    const where = {
      ...(status && { status: status as any }),
      ...(type && { type: type as any }),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        include: {
          _count: { select: { posts: true, userEvents: true } },
        },
        orderBy: { startDate: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.event.count({ where }),
    ]);

    sendPaginated(
      res,
      events.map(e => ({
        ...e,
        postsCount: e._count.posts,
        participantsCount: e._count.userEvents,
        _count: undefined,
      })),
      parseInt(page as string),
      parseInt(limit as string),
      total
    );
  }
);

// POST /admin/events
router.post(
  '/events',
  authenticateAdmin,
  requireAdminRole('SUPER_ADMIN', 'ADMIN'),
  validate([
    body('name').notEmpty(),
    body('type').isIn(['RUNNING', 'FESTIVAL', 'SINGLE']),
    body('region').notEmpty(),
    body('start_date').isISO8601(),
    body('end_date').isISO8601(),
  ]),
  async (req: Request, res: Response) => {
    const event = await prisma.event.create({
      data: {
        name: req.body.name,
        type: req.body.type,
        region: req.body.region,
        description: req.body.description,
        imageUrl: req.body.image_url,
        startDate: new Date(req.body.start_date),
        endDate: new Date(req.body.end_date),
        couponStartTime: req.body.coupon_start_time || '00:00',
        couponEndTime: req.body.coupon_end_time || '20:00',
      },
    });

    sendSuccess(res, event, 201);
  }
);

// PATCH /admin/events/:id/status
router.patch(
  '/events/:id/status',
  authenticateAdmin,
  requireAdminRole('SUPER_ADMIN', 'ADMIN'),
  validate([
    param('id').isUUID(),
    body('status').isIn(['UPCOMING', 'ACTIVE', 'ENDED']),
  ]),
  async (req: Request, res: Response) => {
    const event = await prisma.event.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    });

    sendSuccess(res, event);
  }
);

// ==================== POSTS ====================

// GET /admin/events/:eventId/posts
router.get(
  '/events/:eventId/posts',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    const posts = await prisma.post.findMany({
      where: { eventId: req.params.eventId },
      include: {
        merchant: { select: { id: true, name: true } },
        _count: { select: { postVisits: true } },
      },
      orderBy: { name: 'asc' },
    });

    sendSuccess(res, posts.map(p => ({
      ...p,
      visitsCount: p._count.postVisits,
      _count: undefined,
    })));
  }
);

// POST /admin/events/:eventId/posts
router.post(
  '/events/:eventId/posts',
  authenticateAdmin,
  requireAdminRole('SUPER_ADMIN', 'ADMIN'),
  validate([
    param('eventId').isUUID(),
    body('name').notEmpty(),
    body('category').isIn(['TOURIST', 'BOOTH', 'PERFORMANCE', 'RESTAURANT', 'CAFE', 'ACCOMMODATION', 'OTHER']),
    body('address').notEmpty(),
    body('latitude').isFloat(),
    body('longitude').isFloat(),
  ]),
  async (req: Request, res: Response) => {
    const post = await prisma.post.create({
      data: {
        eventId: req.params.eventId,
        name: req.body.name,
        category: req.body.category,
        description: req.body.description,
        address: req.body.address,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        isRewardPost: req.body.is_reward_post || false,
        merchantId: req.body.merchant_id,
      },
    });

    sendSuccess(res, post, 201);
  }
);

// ==================== MERCHANTS ====================

// GET /admin/merchants
router.get(
  '/merchants',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    const { status, page = '1', limit = '20' } = req.query;

    const where = status ? { status: status as any } : {};

    const [merchants, total] = await Promise.all([
      prisma.merchant.findMany({
        where,
        include: {
          merchantUsers: { where: { role: 'OWNER' }, select: { name: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page as string) - 1) * parseInt(limit as string),
        take: parseInt(limit as string),
      }),
      prisma.merchant.count({ where }),
    ]);

    sendPaginated(
      res,
      merchants.map(m => ({
        ...m,
        owner: m.merchantUsers[0] || null,
        merchantUsers: undefined,
      })),
      parseInt(page as string),
      parseInt(limit as string),
      total
    );
  }
);

// PATCH /admin/merchants/:id/approve
router.patch(
  '/merchants/:id/approve',
  authenticateAdmin,
  requireAdminRole('SUPER_ADMIN', 'ADMIN'),
  validate([param('id').isUUID()]),
  async (req: Request, res: Response) => {
    const merchant = await prisma.merchant.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedAt: new Date() },
    });

    sendSuccess(res, merchant);
  }
);

// PATCH /admin/merchants/:id/reject
router.patch(
  '/merchants/:id/reject',
  authenticateAdmin,
  requireAdminRole('SUPER_ADMIN', 'ADMIN'),
  validate([param('id').isUUID()]),
  async (req: Request, res: Response) => {
    const merchant = await prisma.merchant.update({
      where: { id: req.params.id },
      data: { status: 'REJECTED' },
    });

    sendSuccess(res, merchant);
  }
);

// ==================== COUPON TEMPLATES ====================

// GET /admin/events/:eventId/coupon-templates
router.get(
  '/events/:eventId/coupon-templates',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    const templates = await prisma.couponTemplate.findMany({
      where: { eventId: req.params.eventId },
      orderBy: { createdAt: 'desc' },
    });

    sendSuccess(res, templates);
  }
);

// POST /admin/events/:eventId/coupon-templates
router.post(
  '/events/:eventId/coupon-templates',
  authenticateAdmin,
  requireAdminRole('SUPER_ADMIN', 'ADMIN'),
  validate([
    param('eventId').isUUID(),
    body('name').notEmpty(),
    body('category').isIn(['RESTAURANT', 'CAFE', 'PERFORMANCE', 'ACCOMMODATION', 'OTHER']),
    body('type').isIn(['DISCOUNT_5000', 'DISCOUNT_10000', 'FREE_DRINK', 'ONE_PLUS_ONE', 'PERCENT_50', 'CUSTOM']),
    body('discount_amount').isInt({ min: 0 }),
  ]),
  async (req: Request, res: Response) => {
    const template = await prisma.couponTemplate.create({
      data: {
        eventId: req.params.eventId,
        name: req.body.name,
        category: req.body.category,
        type: req.body.type,
        discountAmount: req.body.discount_amount,
        description: req.body.description,
        maxIssueCount: req.body.max_issue_count,
      },
    });

    sendSuccess(res, template, 201);
  }
);

// ==================== STATS ====================

// GET /admin/stats/overview
router.get(
  '/stats/overview',
  authenticateAdmin,
  async (req: Request, res: Response) => {
    const [
      totalUsers,
      totalEvents,
      totalMerchants,
      activeCoupons,
      usedCoupons,
      pendingMerchants,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.event.count(),
      prisma.merchant.count({ where: { status: 'APPROVED' } }),
      prisma.coupon.count({ where: { status: 'ACTIVE' } }),
      prisma.coupon.count({ where: { status: 'USED' } }),
      prisma.merchant.count({ where: { status: 'PENDING' } }),
    ]);

    sendSuccess(res, {
      totalUsers,
      totalEvents,
      totalMerchants,
      activeCoupons,
      usedCoupons,
      pendingMerchants,
      couponUsageRate: usedCoupons > 0 ? Math.round((usedCoupons / (activeCoupons + usedCoupons)) * 100) : 0,
    });
  }
);

// GET /admin/stats/events/:id
router.get(
  '/stats/events/:id',
  authenticateAdmin,
  validate([param('id').isUUID()]),
  async (req: Request, res: Response) => {
    const eventId = req.params.id;

    const [
      event,
      participantsCount,
      postsCount,
      visitsCount,
      couponsIssued,
      couponsUsed,
      stampsCollected,
    ] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId } }),
      prisma.userEvent.count({ where: { eventId } }),
      prisma.post.count({ where: { eventId } }),
      prisma.postVisit.count({ where: { eventId } }),
      prisma.coupon.count({ where: { eventId } }),
      prisma.coupon.count({ where: { eventId, status: 'USED' } }),
      prisma.stamp.count({ where: { eventId } }),
    ]);

    if (!event) throw new NotFoundError('Event not found');

    sendSuccess(res, {
      event: { id: event.id, name: event.name, status: event.status },
      stats: {
        participants: participantsCount,
        posts: postsCount,
        visits: visitsCount,
        couponsIssued,
        couponsUsed,
        couponUsageRate: couponsIssued > 0 ? Math.round((couponsUsed / couponsIssued) * 100) : 0,
        stampsCollected,
      },
    });
  }
);

export default router;
