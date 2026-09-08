import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, RateLimitOptions } from './rate-limit.decorator';

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!options) return true;

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const now = Date.now();
    const resetAt = now + options.windowMs;
    const key = this.createKey(request);
    const bucket = this.buckets.get(key);

    this.pruneExpiredBuckets(now);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt });
      return true;
    }

    bucket.count += 1;
    if (bucket.count <= options.limit) return true;

    const retryAfterSeconds = Math.ceil((bucket.resetAt - now) / 1000);
    response?.setHeader?.('Retry-After', String(retryAfterSeconds));

    throw new HttpException(
      'Trop de tentatives. Réessayez plus tard.',
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private createKey(request: any): string {
    const ip = request.ip || request.socket?.remoteAddress || 'unknown';
    const route = request.route?.path || request.originalUrl || request.url;

    return `${ip}:${request.method}:${route}`;
  }

  private pruneExpiredBuckets(now: number): void {
    if (this.buckets.size < 1000) return;

    for (const [key, bucket] of this.buckets.entries()) {
      if (bucket.resetAt <= now) {
        this.buckets.delete(key);
      }
    }
  }
}
