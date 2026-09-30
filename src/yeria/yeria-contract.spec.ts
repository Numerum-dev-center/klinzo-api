import { of } from 'rxjs';
import { YeriaContractInterceptor } from './yeria-contract.interceptor';
import {
  YERIA_API_PREFIX,
  YERIA_CONTRACT,
  YERIA_CONTRACT_VERSION,
} from './yeria-contract';

describe('Yeria contract v1', () => {
  it('publishes a stable, major-versioned canonical path', () => {
    expect(YERIA_API_PREFIX).toBe('/api/v1/yeria');
    expect(YERIA_CONTRACT.version).toBe(YERIA_CONTRACT_VERSION);
    expect(YERIA_CONTRACT.status).toBe('stable');
  });

  it('adds contract version headers to Yeria responses', (done) => {
    const setHeader = jest.fn();
    const context = {
      switchToHttp: () => ({ getResponse: () => ({ setHeader }) }),
    } as any;
    const interceptor = new YeriaContractInterceptor();

    interceptor
      .intercept(context, { handle: () => of('ok') } as any)
      .subscribe({
        complete: () => {
          expect(setHeader).toHaveBeenCalledWith(
            'X-Klinzo-Contract-Version',
            '1.0.0',
          );
          expect(setHeader).toHaveBeenCalledWith(
            'X-Klinzo-Contract-Stability',
            'stable',
          );
          done();
        },
      });
  });
});
