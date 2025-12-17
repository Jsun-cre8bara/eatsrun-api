import { Request, Response, NextFunction } from 'express';
import { 
  verifyAccessToken, 
  verifyMerchantToken, 
  verifyAdminToken,
  TokenPayload,
  MerchantTokenPayload,
  AdminTokenPayload
} from '../utils/jwt';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
      merchantUser?: MerchantTokenPayload;
      adminUser?: AdminTokenPayload;
    }
  }
}

// Extract token from header
const extractToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
};

// User authentication
export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  // 개발 모드: 테스트 토큰 허용
  if (process.env.NODE_ENV !== 'production' && token.startsWith('mock-access-token-')) {
    // 모의 사용자 ID 추출
    // 토큰 형식: mock-access-token-{timestamp} 또는 mock-access-token-{userId}
    const tokenParts = token.replace('mock-access-token-', '');
    // 타임스탬프인 경우 기본 테스트 사용자 ID 사용
    const mockUserId = /^\d+$/.test(tokenParts) 
      ? 'test-user-dev-mode' 
      : tokenParts || 'test-user-dev-mode';
    
    req.user = {
      userId: mockUserId,
      type: 'access',
    };
    console.log('🧪 개발 모드: 테스트 토큰 허용, userId:', mockUserId);
    return next();
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    // 개발 모드에서 토큰 검증 실패 시 더 명확한 에러 메시지
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Token verification failed:', error);
    }
    throw error;
  }
};

// Optional user authentication (doesn't throw if no token)
export const optionalAuthenticateUser = (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
    } catch (error) {
      // Ignore token errors for optional auth
    }
  }
  next();
};

// Merchant authentication
export const authenticateMerchant = (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  const payload = verifyMerchantToken(token);
  req.merchantUser = payload;
  next();
};

// Admin authentication
export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = extractToken(req);
  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  const payload = verifyAdminToken(token);
  req.adminUser = payload;
  next();
};

// Role-based authorization for admin
export const requireAdminRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.adminUser) {
      throw new UnauthorizedError('Admin authentication required');
    }

    if (!roles.includes(req.adminUser.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    next();
  };
};

// Check if merchant is approved
export const requireApprovedMerchant = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.merchantUser) {
    throw new UnauthorizedError('Merchant authentication required');
  }
  
  // Additional check can be done in service layer
  next();
};
