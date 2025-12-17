import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './errors';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'default-refresh-secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '14d';

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
  return jwt.sign(
    { userId, type: 'access' } as TokenPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const generateRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId, type: 'refresh' } as TokenPayload,
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
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
  return jwt.sign(
    { merchantUserId, merchantId, type: 'access' } as MerchantTokenPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const generateMerchantRefreshToken = (merchantUserId: string, merchantId: string): string => {
  return jwt.sign(
    { merchantUserId, merchantId, type: 'refresh' } as MerchantTokenPayload,
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
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
  return jwt.sign(
    { adminId, role, type: 'access' } as AdminTokenPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const generateAdminRefreshToken = (adminId: string, role: string): string => {
  return jwt.sign(
    { adminId, role, type: 'refresh' } as AdminTokenPayload,
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
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
