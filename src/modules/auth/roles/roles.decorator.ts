import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../../types/enums';

export const ROLES_KEY = 'roles';
// export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

export const Roles = (...roles: UserRole[]) => {
  return SetMetadata(ROLES_KEY, roles);
};
