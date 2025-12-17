import prisma from '../utils/prisma';
import { NotFoundError, BadRequestError, ConflictError } from '../utils/errors';
import { RewardTier, RewardStatus } from '@prisma/client';

export class StampService {
  // 스탬프 현황 조회
  async getStamps(userId: string, eventId: string) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundError('Event not found');
    }

    const stamps = await prisma.stamp.findMany({
      where: { userId, eventId },
      include: {
        post: {
          select: {
            id: true,
            name: true,
            category: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { collectedAt: 'asc' },
    });

    const totalStamps = stamps.length;
    
    const nextReward = await prisma.rewardTemplate.findFirst({
      where: {
        eventId,
        requiredStamps: { gt: totalStamps },
        isActive: true,
        remainingQuantity: { gt: 0 },
      },
      orderBy: { requiredStamps: 'asc' },
    });

    const claimableRewards = await this.getClaimableRewards(userId, eventId, totalStamps);

    return {
      totalStamps,
      stamps: stamps.map(s => ({
        postId: s.postId,
        postName: s.post.name,
        postCategory: s.post.category,
        postImage: s.post.imageUrl,
        collectedAt: s.collectedAt,
      })),
      nextReward: nextReward ? {
        tier: nextReward.tier,
        requiredStamps: nextReward.requiredStamps,
        remaining: nextReward.requiredStamps - totalStamps,
        rewardName: nextReward.name,
        rewardImage: nextReward.imageUrl,
      } : null,
      claimableRewards,
    };
  }

  private async getClaimableRewards(userId: string, eventId: string, totalStamps: number) {
    const existingRewards = await prisma.reward.findMany({
      where: { userId, eventId },
      select: { tier: true },
    });
    const claimedTiers = existingRewards.map(r => r.tier);

    const claimableTemplates = await prisma.rewardTemplate.findMany({
      where: {
        eventId,
        requiredStamps: { lte: totalStamps },
        isActive: true,
        remainingQuantity: { gt: 0 },
        tier: { notIn: claimedTiers },
      },
      orderBy: { requiredStamps: 'asc' },
    });

    return claimableTemplates.map(t => ({
      templateId: t.id,
      tier: t.tier,
      name: t.name,
      requiredStamps: t.requiredStamps,
      imageUrl: t.imageUrl,
    }));
  }

  async claimReward(userId: string, templateId: string) {
    const template = await prisma.rewardTemplate.findUnique({
      where: { id: templateId },
      include: { event: true },
    });

    if (!template) {
      throw new NotFoundError('Reward template not found');
    }

    if (!template.isActive || template.remainingQuantity <= 0) {
      throw new BadRequestError('Reward not available');
    }

    const stampCount = await prisma.stamp.count({
      where: { userId, eventId: template.eventId },
    });

    if (stampCount < template.requiredStamps) {
      throw new BadRequestError(`Need ${template.requiredStamps} stamps`);
    }

    const existingReward = await prisma.reward.findFirst({
      where: { userId, eventId: template.eventId, tier: template.tier },
    });

    if (existingReward) {
      throw new ConflictError('Already claimed this tier reward');
    }

    const [reward] = await prisma.$transaction([
      prisma.reward.create({
        data: {
          userId,
          eventId: template.eventId,
          templateId: template.id,
          tier: template.tier,
        },
      }),
      prisma.rewardTemplate.update({
        where: { id: template.id },
        data: { remainingQuantity: { decrement: 1 } },
      }),
    ]);

    return {
      reward: {
        id: reward.id,
        tier: reward.tier,
        name: template.name,
        description: template.description,
        imageUrl: template.imageUrl,
        qrCode: reward.qrCode,
        status: reward.status,
      },
    };
  }

  async getRewards(userId: string, eventId: string) {
    const rewards = await prisma.reward.findMany({
      where: { userId, eventId },
      include: {
        template: { select: { name: true, description: true, imageUrl: true } },
        redeemPost: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return rewards.map(r => ({
      id: r.id,
      tier: r.tier,
      name: r.template.name,
      description: r.template.description,
      imageUrl: r.template.imageUrl,
      qrCode: r.qrCode,
      status: r.status,
      redeemedAt: r.redeemedAt,
      redeemPost: r.redeemPost,
      createdAt: r.createdAt,
    }));
  }

  async redeemReward(userId: string, rewardId: string, postId: string) {
    const reward = await prisma.reward.findUnique({
      where: { id: rewardId },
      include: { template: true },
    });

    if (!reward) throw new NotFoundError('Reward not found');
    if (reward.userId !== userId) throw new BadRequestError('Not your reward');
    if (reward.status !== 'AVAILABLE') throw new BadRequestError('Reward not available');

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || !post.isRewardPost) throw new BadRequestError('Invalid reward post');
    if (post.eventId !== reward.eventId) throw new BadRequestError('Post not in same event');

    const updatedReward = await prisma.reward.update({
      where: { id: rewardId },
      data: { status: 'REDEEMED', redeemPostId: postId, redeemedAt: new Date() },
    });

    return { success: true, redeemedAt: updatedReward.redeemedAt, rewardName: reward.template.name };
  }
}

export default new StampService();
