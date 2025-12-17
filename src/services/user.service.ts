import prisma from '../utils/prisma';
import { NotFoundError } from '../utils/errors';

export class UserService {
  // 내 정보 조회
  async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        socialProvider: true,
        name: true,
        phone: true,
        isVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  // 내 정보 수정
  async updateMe(userId: string, data: { name?: string; phone?: string }) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.phone && { phone: data.phone }),
      },
      select: {
        id: true,
        socialProvider: true,
        name: true,
        phone: true,
        isVerified: true,
        createdAt: true,
      },
    });

    return user;
  }

  // FCM 토큰 등록
  async updateFcmToken(userId: string, fcmToken: string) {
    await prisma.user.update({
      where: { id: userId },
      data: { fcmToken },
    });

    return { success: true };
  }

  // 회원 탈퇴
  async deleteAccount(userId: string) {
    await prisma.user.delete({
      where: { id: userId },
    });

    return { success: true };
  }

  // 내 참여 행사 목록
  async getMyEvents(userId: string) {
    const userEvents = await prisma.userEvent.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            type: true,
            region: true,
            startDate: true,
            endDate: true,
            status: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    return userEvents.map(ue => ({
      userEventId: ue.id,
      userType: ue.userType,
      isFinished: ue.isFinished,
      joinedAt: ue.joinedAt,
      event: ue.event,
    }));
  }
}

export default new UserService();
