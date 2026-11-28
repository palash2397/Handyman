import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ApiResponse } from '../../../helpers/ApiResponse';
import { ROLES_KEY } from './roles.decorator';
import { UserRole } from '../../../types/enums';
import { Msg } from '../../../helpers/responseMsg';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log(user);

    const rawRoles = user?.roles || user?.role;
    if (!user || !rawRoles) {
      throw new ForbiddenException(new ApiResponse(403, {}, Msg.FORBIDDEN));
    }

    // Convert string roles (like "ADMIN") from JWT into an array
    const userRoles = Array.isArray(rawRoles) ? rawRoles : [rawRoles];

    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(new ApiResponse(403, {}, Msg.FORBIDDEN));
    }

    return true;
  }
}
