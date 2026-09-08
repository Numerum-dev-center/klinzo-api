import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserEntity } from '../user/users/entities/user.entity';

export const GetYeriaUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): UserEntity | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.yeriaUser || request.user;
  },
);
