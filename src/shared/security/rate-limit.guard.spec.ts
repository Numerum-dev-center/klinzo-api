import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  it('blocks requests after the configured limit', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue({
        limit: 2,
        windowMs: 60_000,
      }),
    } as unknown as Reflector;
    const setHeader = jest.fn();
    const guard = new RateLimitGuard(reflector);
    const context = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          ip: '127.0.0.1',
          method: 'POST',
          route: { path: '/auth/login' },
        }),
        getResponse: () => ({ setHeader }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });
});
