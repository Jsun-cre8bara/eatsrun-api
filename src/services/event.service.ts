import prisma from '../utils/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { EventStatus, EventType, UserType } from '@prisma/client';

interface GetEventsParams {
  status?: EventStatus;
  type?: EventType;
  region?: string;
  page?: number;
  limit?: number;
}

export class EventService {
  // 행사 생성
  async createEvent(eventData: {
    name: string;
    type: EventType;
    region: string;
    startDate: Date;
    endDate: Date;
    description?: string;
    imageUrl?: string;
  }) {
    // 날짜 유효성 검사
    if (eventData.startDate >= eventData.endDate) {
      throw new BadRequestError('End date must be after start date');
    }

    // 행사 생성
    const event = await prisma.event.create({
      data: {
        name: eventData.name,
        type: eventData.type,
        region: eventData.region,
        description: eventData.description,
        imageUrl: eventData.imageUrl,
        startDate: eventData.startDate,
        endDate: eventData.endDate,
        status: 'UPCOMING', // 기본값
      },
      select: {
        id: true,
        name: true,
        type: true,
        region: true,
        startDate: true,
        endDate: true,
        status: true,
        imageUrl: true,
        description: true,
      },
    });

    return event;
  }

  // 행사 목록 조회
  async getEvents(params: GetEventsParams) {
    const { status, type, region, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(type && { type }),
      ...(region && { region: { contains: region } }),
    };

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        select: {
          id: true,
          name: true,
          type: true,
          region: true,
          startDate: true,
          endDate: true,
          status: true,
          imageUrl: true,
          _count: {
            select: {
              posts: true,
              userEvents: true,
            },
          },
        },
        orderBy: { startDate: 'asc' },
        skip,
        take: limit,
      }),
      prisma.event.count({ where }),
    ]);

    return {
      items: events.map(e => ({
        ...e,
        postsCount: e._count.posts,
        participantsCount: e._count.userEvents,
        _count: undefined,
      })),
      total,
      page,
      limit,
    };
  }

  // 행사 상세 조회
  async getEventById(eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: {
            posts: true,
            userEvents: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    return {
      ...event,
      postsCount: event._count.posts,
      participantsCount: event._count.userEvents,
      _count: undefined,
    };
  }

  // 행사 참여
  async joinEvent(userId: string, eventId: string, userType: UserType) {
    // 행사 존재 및 상태 확인
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    if (event.status === 'ENDED') {
      throw new BadRequestError('Event has ended');
    }

    // 이미 참여중인지 확인
    const existing = await prisma.userEvent.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (existing) {
      throw new ConflictError('Already joined this event');
    }

    // 참여 등록
    const userEvent = await prisma.userEvent.create({
      data: {
        userId,
        eventId,
        userType,
      },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return {
      userEventId: userEvent.id,
      event: userEvent.event,
      userType: userEvent.userType,
      joinedAt: userEvent.joinedAt,
    };
  }

  // 내 참여 현황 조회
  async getMyEventStatus(userId: string, eventId: string) {
    const userEvent = await prisma.userEvent.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (!userEvent) {
      throw new NotFoundError('Not participating in this event');
    }

    // 통계 조회
    const [visitedPosts, totalPosts, coupons, stamps, rewards] = await Promise.all([
      prisma.postVisit.count({
        where: { userId, eventId },
      }),
      prisma.post.count({
        where: { eventId, isActive: true },
      }),
      prisma.coupon.count({
        where: { userId, eventId, status: 'ACTIVE' },
      }),
      prisma.stamp.count({
        where: { userId, eventId },
      }),
      prisma.reward.findMany({
        where: { userId, eventId },
        select: {
          id: true,
          tier: true,
          status: true,
        },
      }),
    ]);

    return {
      userType: userEvent.userType,
      visitedPosts,
      totalPosts,
      couponsCount: coupons,
      stampsCount: stamps,
      isFinished: userEvent.isFinished,
      finishedAt: userEvent.finishedAt,
      rewards,
    };
  }

  // 완주 인증
  async verifyFinish(userId: string, eventId: string, finishCode: string) {
    const userEvent = await prisma.userEvent.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (!userEvent) {
      throw new NotFoundError('Not participating in this event');
    }

    if (userEvent.isFinished) {
      throw new ConflictError('Already verified finish');
    }

    if (userEvent.userType !== 'RUNNER') {
      throw new BadRequestError('Only runners can verify finish');
    }

    // 실제로는 메달 바코드 검증 로직 필요
    // 여기서는 시뮬레이션으로 성공 처리

    // 완주 인증 업데이트
    await prisma.userEvent.update({
      where: { id: userEvent.id },
      data: {
        isFinished: true,
        finishCode,
        finishedAt: new Date(),
      },
    });

    // 보너스 쿠폰 활성화 (완주 보상)
    // 실제로는 비활성 상태의 쿠폰을 활성화하는 로직
    const bonusCoupons = await prisma.coupon.findMany({
      where: {
        userId,
        eventId,
        status: 'ACTIVE',
      },
      take: 3,
      select: {
        id: true,
        category: true,
        type: true,
      },
    });

    return {
      verified: true,
      finishedAt: new Date(),
      bonusCoupons,
    };
  }
}

export default new EventService();
