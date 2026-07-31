import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Defense in depth: guarantees `correctAnswer` never reaches a STUDENT payload even if a
// future query forgets to `select` it out explicitly.
@Injectable()
export class StripCorrectAnswerInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => this.strip(data)));
  }

  private strip(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.strip(item));
    }

    if (value !== null && typeof value === 'object') {
      const entries = Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== 'correctAnswer')
        .map(([key, val]) => [key, this.strip(val)]);
      return Object.fromEntries(entries);
    }

    return value;
  }
}
