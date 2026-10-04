import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  role: 'admin' | 'dispatcher' | 'store_manager' | 'loader' | 'driver';
  depotId?: string | null;
  outletId?: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
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
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      depotId: payload.depotId,
      outletId: payload.outletId,
    };
  }
}
