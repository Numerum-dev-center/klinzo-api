import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetAgentCollector = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.agentCollector;
  },
);
