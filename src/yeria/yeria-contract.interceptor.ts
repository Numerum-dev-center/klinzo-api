import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { YERIA_CONTRACT_VERSION } from './yeria-contract';

@Injectable()
export class YeriaContractInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Klinzo-Contract-Version', YERIA_CONTRACT_VERSION);
    response.setHeader('X-Klinzo-Contract-Stability', 'stable');
    return next.handle();
  }
}
