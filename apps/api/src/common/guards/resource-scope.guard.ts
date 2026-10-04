import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { RequestUser } from '../decorators/current-user.decorator';

@Injectable()
export class ResourceScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as RequestUser;

    if (!user) {
      return true;
    }

    if (user.role === 'admin' || user.role === 'dispatcher') {
      return true;
    }

    // For store managers, ensure outlet-level scope matching if outletId is in body or query
    if (user.role === 'store_manager') {
      const requestedOutletId =
        request.body?.outletId || request.query?.outletId || request.params?.outletId;
      if (requestedOutletId && user.outletId && requestedOutletId !== user.outletId) {
        throw new ForbiddenException(
          'Store Managers are restricted to operations on their assigned outlet only',
        );
      }
    }

    return true;
  }
}
