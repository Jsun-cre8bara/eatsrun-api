import axios from 'axios';
import prisma from '../utils/prisma';
import { 
  generateAccessToken, 
  generateRefreshToken,
  verifyRefreshToken 
} from '../utils/jwt';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { SocialProvider } from '@prisma/client';

interface KakaoUserInfo {
  id: number;
  kakao_account?: {
    email?: string;
    profile?: {
      nickname?: string;
    };
  };
}

interface NaverUserInfo {
  response: {
    id: string;
    email?: string;
    name?: string;
  };
}

interface SocialLoginResult {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string | null;
    isVerified: boolean;
  };
  isNewUser: boolean;
}

export class AuthService {
  // Kakao 사용자 정보 조회
  private async getKakaoUserInfo(accessToken: string): Promise<KakaoUserInfo> {
    try {
      const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      throw new BadRequestError('Invalid Kakao access token');
    }
  }

  // Naver 사용자 정보 조회
  private async getNaverUserInfo(accessToken: string): Promise<NaverUserInfo> {
    try {
      const response = await axios.get('https://openapi.naver.com/v1/nid/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return response.data;
    } catch (error) {
      throw new BadRequestError('Invalid Naver access token');
    }
  }

  // 소셜 로그인
  async socialLogin(provider: string, socialAccessToken: string): Promise<SocialLoginResult> {
    let socialId: string;
    let name: string | null = null;

    // 소셜 플랫폼별 사용자 정보 조회
    if (provider === 'kakao') {
      const kakaoUser = await this.getKakaoUserInfo(socialAccessToken);
      socialId = String(kakaoUser.id);
      name = kakaoUser.kakao_account?.profile?.nickname || null;
    } else if (provider === 'naver') {
      const naverUser = await this.getNaverUserInfo(socialAccessToken);
      socialId = naverUser.response.id;
      name = naverUser.response.name || null;
    } else {
      throw new BadRequestError('Invalid provider. Use "kakao" or "naver"');
    }

    const socialProvider = provider.toUpperCase() as SocialProvider;

    // 기존 사용자 확인 또는 신규 생성
    let user = await prisma.user.findUnique({
      where: {
        socialProvider_socialId: {
          socialProvider,
          socialId,
        },
      },
    });

    let isNewUser = false;

    if (!user) {
      // 신규 사용자 생성
      user = await prisma.user.create({
        data: {
          socialId,
          socialProvider,
          name,
        },
      });
      isNewUser = true;
    }

    // JWT 토큰 생성
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        isVerified: user.isVerified,
      },
      isNewUser,
    };
  }

  // 토큰 갱신
  async refreshToken(refreshTokenStr: string): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = verifyRefreshToken(refreshTokenStr);
    
    // 사용자 존재 확인
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // 새 토큰 발급
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    return { accessToken, refreshToken };
  }

  // 러너 본인 인증
  async verifyRunner(
    userId: string, 
    name: string, 
    phone: string,
    eventId?: string
  ): Promise<{ verified: boolean; matchedEvents: any[] }> {
    // 실제로는 외부 러너 DB와 매칭해야 함
    // 여기서는 시뮬레이션
    
    // 사용자 정보 업데이트
    await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        phone,
        isVerified: true,
      },
    });

    // 매칭된 행사 조회 (시뮬레이션 - 실제로는 외부 DB 연동)
    const upcomingEvents = await prisma.event.findMany({
      where: {
        type: 'RUNNING',
        status: { in: ['UPCOMING', 'ACTIVE'] },
        ...(eventId && { id: eventId }),
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        region: true,
      },
      take: 5,
    });

    return {
      verified: true,
      matchedEvents: upcomingEvents.map(e => ({
        eventId: e.id,
        eventName: e.name,
        startDate: e.startDate,
        region: e.region,
      })),
    };
  }
}

export default new AuthService();
