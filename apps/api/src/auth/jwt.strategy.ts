import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'dispatcher' | 'store_manager' | 'loader' | 'driver';
  depotId?: string | null;
  outletId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDb,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'super_secret_jwt_signing_key_at_least_64_characters_long_for_hs512_security',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid authentication credentials');
    }
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, payload.sub),
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('User account is invalid or deactivated');
    }
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      depotId: user.depotId,
      outletId: user.outletId,
    };
  }
}
