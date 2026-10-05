import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import { LoginDto, RefreshTokenDto, UpdateProfileDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: DrizzleDb,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.email, loginDto.email.toLowerCase()),
      with: {
        outlet: true,
        depot: true,
        driverProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await argon2.verify(user.passwordHash, loginDto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      depotId: user.depotId,
      outletId: user.outletId,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get(
        'JWT_REFRESH_SECRET',
        'super_secret_refresh_jwt_key_different_from_access_secret_entropy',
      ),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        depotId: user.depotId,
        outletId: user.outletId,
        outlet: user.outlet,
        depot: user.depot,
        driverProfile: user.driverProfile,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get(
          'JWT_REFRESH_SECRET',
          'super_secret_refresh_jwt_key_different_from_access_secret_entropy',
        ),
      });

      const user = await this.db.query.users.findFirst({
        where: eq(schema.users.id, payload.sub),
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account is invalid or deactivated');
      }

      const newPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        depotId: user.depotId,
        outletId: user.outletId,
      };

      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
      });

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string) {
    const user = await this.db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      with: {
        outlet: true,
        depot: true,
        driverProfile: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const [updated] = await this.db.update(schema.users).set({
      ...(dto.firstName !== undefined ? { firstName: dto.firstName.trim() } : {}),
      ...(dto.lastName !== undefined ? { lastName: dto.lastName.trim() } : {}),
      ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
      updatedAt: new Date(),
    }).where(eq(schema.users.id, userId)).returning({
      id: schema.users.id,
      email: schema.users.email,
      firstName: schema.users.firstName,
      lastName: schema.users.lastName,
      role: schema.users.role,
      outletId: schema.users.outletId,
      depotId: schema.users.depotId,
      phone: schema.users.phone,
      isActive: schema.users.isActive,
      updatedAt: schema.users.updatedAt,
    });
    if (!updated?.isActive) throw new UnauthorizedException('User not found');
    return updated;
  }
}
