import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';

export type NotificationKind =
  | 'ORDER_CREATED'
  | 'PLAN_PUBLISHED'
  | 'PLAN_REVISED'
  | 'LOADING_EXCEPTION'
  | 'LOADING_EXCEPTION_RESOLVED'
  | 'DEPARTURE_CLEARED'
  | 'DRIVER_READY'
  | 'TRIP_DEPARTED'
  | 'LATE_RISK'
  | 'DELIVERY_COMPLETED'
  | 'DELIVERY_EXCEPTION'
  | 'ORDER_DEFERRED'
  | 'RECEIPT_CONFIRMED'
  | 'RECEIVING_DISCREPANCY'
  | 'SYNC_CONFLICT';

export interface CreateNotificationInput {
  userIds: string[];
  type: NotificationKind;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb) {}

  async create(input: CreateNotificationInput) {
    const userIds = [...new Set(input.userIds.filter(Boolean))];
    if (!userIds.length) return [];
    return this.db.insert(schema.notifications).values(userIds.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      payload: input.payload ?? {},
    }))).returning();
  }

  async usersForRoles(roles: Array<'admin' | 'dispatcher' | 'store_manager' | 'loader' | 'driver'>, scope?: { depotId?: string; outletIds?: string[] }) {
    const rows = await this.db.query.users.findMany({
      where: and(eq(schema.users.isActive, true), inArray(schema.users.role, roles)),
    });
    return rows
      .filter((user) => !scope?.depotId || user.role === 'admin' || user.depotId === scope.depotId)
      .filter((user) => !scope?.outletIds?.length || user.role !== 'store_manager' || Boolean(user.outletId && scope.outletIds.includes(user.outletId)))
      .map((user) => user.id);
  }

  async list(userId: string, unreadOnly = false) {
    return this.db.query.notifications.findMany({
      where: unreadOnly
        ? and(eq(schema.notifications.userId, userId), eq(schema.notifications.isRead, false))
        : eq(schema.notifications.userId, userId),
      orderBy: [desc(schema.notifications.createdAt)],
      limit: 100,
    });
  }

  async markRead(notificationId: string, userId: string) {
    const [updated] = await this.db.update(schema.notifications).set({
      isRead: true,
      readAt: new Date(),
    }).where(and(
      eq(schema.notifications.id, notificationId),
      eq(schema.notifications.userId, userId),
    )).returning();
    if (!updated) throw new NotFoundException('Notification not found');
    return updated;
  }
}
