import { SignJWT, jwtVerify } from 'jose';

const encoder = new TextEncoder();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET or AUTH_SECRET is required');
  }
  return encoder.encode(secret);
}

export type FrontJwtPayload = {
  sub: string;
  typ: 'front';
  email?: string;
};

export async function signFrontAccessToken(userId: string, email?: string) {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d';
  const builder = new SignJWT({ typ: 'front', email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt();

  if (expiresIn.endsWith('d')) {
    const days = Number.parseInt(expiresIn, 10);
    builder.setExpirationTime(`${days}d`);
  } else {
    builder.setExpirationTime(expiresIn);
  }

  return builder.sign(getJwtSecret());
}

export async function verifyFrontAccessToken(token: string): Promise<FrontJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    if (payload.typ !== 'front' || typeof payload.sub !== 'string') {
      return null;
    }
    return {
      sub: payload.sub,
      typ: 'front',
      email: typeof payload.email === 'string' ? payload.email : undefined,
    };
  } catch {
    return null;
  }
}

export function extractBearerToken(authorization: string | null | undefined) {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }
  const token = authorization.slice('Bearer '.length).trim();
  return token || null;
}
