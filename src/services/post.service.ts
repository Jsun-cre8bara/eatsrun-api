import prisma from '../utils/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '../utils/errors';
import { PostCategory, GameType, MerchantCategory } from '@prisma/client';

interface GetPostsParams {
  eventId: string;
  category?: PostCategory;
  visited?: boolean;
  userId?: string;
}

export class PostService {
  // 포스트 생성
  async createPost(eventId: string, postData: {
    name: string;
    category: PostCategory;
    description?: string;
    imageUrl?: string;
    address: string;
    latitude: number;
    longitude: number;
    isRewardPost?: boolean;
    operatingHours?: any;
    merchantId?: string;
  }) {
    // 행사 존재 확인
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    // 상점 연결 확인 (merchantId가 있는 경우)
    if (postData.merchantId) {
      const merchant = await prisma.merchant.findUnique({
        where: { id: postData.merchantId },
      });

      if (!merchant) {
        throw new NotFoundError('Merchant not found');
      }

      // 행사-상점 연결 확인
      const eventMerchant = await prisma.eventMerchant.findUnique({
        where: {
          eventId_merchantId: {
            eventId,
            merchantId: postData.merchantId,
          },
        },
      });

      if (!eventMerchant) {
        throw new BadRequestError('Merchant is not associated with this event');
      }
    }

    // 포스트 생성
    const post = await prisma.post.create({
      data: {
        eventId,
        name: postData.name,
        category: postData.category,
        description: postData.description,
        imageUrl: postData.imageUrl,
        address: postData.address,
        latitude: postData.latitude,
        longitude: postData.longitude,
        isRewardPost: postData.isRewardPost || false,
        operatingHours: postData.operatingHours,
        merchantId: postData.merchantId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        imageUrl: true,
        address: true,
        latitude: true,
        longitude: true,
        qrCode: true,
        isRewardPost: true,
        operatingHours: true,
        merchant: postData.merchantId ? {
          select: {
            id: true,
            name: true,
            category: true,
          },
        } : undefined,
      },
    });

    return {
      ...post,
      latitude: Number(post.latitude),
      longitude: Number(post.longitude),
    };
  }

  // 포스트 목록 조회
  async getPosts(params: GetPostsParams) {
    const { eventId, category, visited, userId } = params;

    const posts = await prisma.post.findMany({
      where: {
        eventId,
        isActive: true,
        ...(category && { category }),
      },
      select: {
        id: true,
        name: true,
        category: true,
        description: true,
        imageUrl: true,
        address: true,
        latitude: true,
        longitude: true,
        isRewardPost: true,
        operatingHours: true,
        merchant: {
          select: {
            id: true,
            name: true,
            category: true,
          },
        },
        ...(userId && {
          postVisits: {
            where: { userId },
            select: { id: true },
            take: 1,
          },
        }),
      },
      orderBy: { name: 'asc' },
    });

    let result = posts.map(p => ({
      ...p,
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      isVisited: userId ? (p as any).postVisits?.length > 0 : undefined,
      postVisits: undefined,
    }));

    // 방문 여부 필터링
    if (visited !== undefined && userId) {
      result = result.filter(p => p.isVisited === visited);
    }

    return result;
  }

  // 포스트 상세 조회
  async getPostById(postId: string, userId?: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        merchant: {
          select: {
            id: true,
            name: true,
            category: true,
            phone: true,
          },
        },
        ...(userId && {
          postVisits: {
            where: { userId },
            select: { id: true, visitedAt: true },
            take: 1,
          },
        }),
      },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    return {
      ...post,
      latitude: Number(post.latitude),
      longitude: Number(post.longitude),
      isVisited: userId ? (post as any).postVisits?.length > 0 : undefined,
      visitedAt: userId ? (post as any).postVisits?.[0]?.visitedAt : undefined,
      postVisits: undefined,
    };
  }

  // 포스트 방문 (QR 스캔)
  async visitPost(
    userId: string, 
    postId: string, 
    qrCode: string,
    location?: { latitude: number; longitude: number }
  ) {
    // 포스트 확인
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        event: true,
      },
    });

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    if (!post.isActive) {
      throw new BadRequestError('Post is not active');
    }

    // QR 코드 확인
    if (post.qrCode !== qrCode) {
      throw new BadRequestError('Invalid QR code');
    }

    // 행사 상태 확인
    if (post.event.status !== 'ACTIVE') {
      throw new BadRequestError('Event is not active');
    }

    // 이미 방문했는지 확인
    const existingVisit = await prisma.postVisit.findFirst({
      where: {
        userId,
        postId,
        eventId: post.eventId,
      },
    });

    if (existingVisit) {
      throw new ConflictError('Already visited this post');
    }

    // 방문 기록 생성
    const postVisit = await prisma.postVisit.create({
      data: {
        userId,
        postId,
        eventId: post.eventId,
        ...(location && {
          latitude: location.latitude,
          longitude: location.longitude,
        }),
      },
    });

    // 스탬프 수집 (축제형)
    let stampCollected = false;
    let currentStamps = 0;

    if (post.event.type === 'FESTIVAL') {
      await prisma.stamp.create({
        data: {
          userId,
          eventId: post.eventId,
          postId,
        },
      });
      stampCollected = true;
      currentStamps = await prisma.stamp.count({
        where: { userId, eventId: post.eventId },
      });
    }

    // 게임 정보 생성 (러닝/단일행사)
    const gameTypes: GameType[] = ['ROULETTE', 'LADDER', 'CAPSULE', 'CARD', 'SLOT'];
    const randomGameType = gameTypes[Math.floor(Math.random() * gameTypes.length)];

    // 사용 가능한 카테고리 (행사에 등록된 상점 카테고리)
    const availableCategories = await prisma.eventMerchant.findMany({
      where: { eventId: post.eventId, isActive: true },
      select: {
        merchant: {
          select: { category: true },
        },
      },
      distinct: ['merchantId'],
    });

    const categories = [...new Set(availableCategories.map(em => em.merchant.category))];

    return {
      visitId: postVisit.id,
      visitedAt: postVisit.visitedAt,
      game: {
        gameId: postVisit.id, // 방문 ID를 게임 ID로 사용
        gameType: randomGameType,
        availableCategories: categories,
      },
      stampCollected,
      currentStamps,
    };
  }

  // 근처 포스트 조회
  async getNearbyPosts(
    eventId: string,
    latitude: number,
    longitude: number,
    radiusKm: number = 1
  ) {
    // PostgreSQL의 earthdistance 확장 사용하면 더 정확
    // 간단한 구현으로 대체
    const posts = await prisma.post.findMany({
      where: {
        eventId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        category: true,
        latitude: true,
        longitude: true,
        isRewardPost: true,
      },
    });

    // 거리 계산 (Haversine formula 간소화)
    const toRad = (deg: number) => deg * (Math.PI / 180);
    const R = 6371; // Earth radius in km

    const nearbyPosts = posts
      .map(post => {
        const lat1 = toRad(latitude);
        const lat2 = toRad(Number(post.latitude));
        const dLat = toRad(Number(post.latitude) - latitude);
        const dLon = toRad(Number(post.longitude) - longitude);

        const a = Math.sin(dLat / 2) ** 2 +
                  Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        return {
          ...post,
          latitude: Number(post.latitude),
          longitude: Number(post.longitude),
          distance: Math.round(distance * 1000), // meters
        };
      })
      .filter(post => post.distance <= radiusKm * 1000)
      .sort((a, b) => a.distance - b.distance);

    return nearbyPosts;
  }
}

export default new PostService();
