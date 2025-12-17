import jwt, { SignOptions } from 'jsonwebtoken';
import { UnauthorizedError } from './errors';

const JWT_SECRET: string = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_REFRESH_SECRET: string = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN: string = process.env.JWT_REFRESH_EXPIRES_IN || '14d';

export interface TokenPayload {
  userId: string;
  type: 'access' | 'refresh';
}

export interface MerchantTokenPayload {
  merchantUserId: string;
  merchantId: string;
  type: 'access' | 'refresh';
}

export interface AdminTokenPayload {
  adminId: string;
  role: string;
  type: 'access' | 'refresh';
}

// User tokens
export const generateAccessToken = (userId: string): string => {
  const payload: TokenPayload = { userId, type: 'access' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

export const generateRefreshToken = (userId: string): string => {
  const payload: TokenPayload = { userId, type: 'refresh' };
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as TokenPayload;
    if (payload.type !== 'access') {
      throw new UnauthorizedError('Invalid token type');
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw error;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Refresh token expired');
    }
    throw new UnauthorizedError('Invalid refresh token');
  }
};

// Merchant tokens
export const generateMerchantAccessToken = (merchantUserId: string, merchantId: string): string => {
  const payload: MerchantTokenPayload = { merchantUserId, merchantId, type: 'access' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

export const generateMerchantRefreshToken = (merchantUserId: string, merchantId: string): string => {
  const payload: MerchantTokenPayload = { merchantUserId, merchantId, type: 'refresh' };
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });
};

export const verifyMerchantToken = (token: string): MerchantTokenPayload => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as MerchantTokenPayload;
    if (!payload.merchantUserId) {
      throw new UnauthorizedError('Invalid merchant token');
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
};

// Admin tokens
export const generateAdminAccessToken = (adminId: string, role: string): string => {
  const payload: AdminTokenPayload = { adminId, role, type: 'access' };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN as any });
};

export const generateAdminRefreshToken = (adminId: string, role: string): string => {
  const payload: AdminTokenPayload = { adminId, role, type: 'refresh' };
  return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN as any });
};

export const verifyAdminToken = (token: string): AdminTokenPayload => {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AdminTokenPayload;
    if (!payload.adminId) {
      throw new UnauthorizedError('Invalid admin token');
    }
    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token expired');
    }
    throw new UnauthorizedError('Invalid token');
  }
};
