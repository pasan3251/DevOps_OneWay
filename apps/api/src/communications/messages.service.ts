import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { DRIZZLE_ORM, DrizzleDb } from '../database/database.module';
import * as schema from '../database/schema';
import { CreateConversationDto, SendMessageDto } from './dto/communications.dto';

@Injectable()
export class MessagesService {
  constructor(@Inject(DRIZZLE_ORM) private readonly db: DrizzleDb) {}

  private async assertParticipant(conversationId: string, userId: string) {
    const participant = await this.db.query.conversationParticipants.findFirst({
      where: and(
        eq(schema.conversationParticipants.conversationId, conversationId),
        eq(schema.conversationParticipants.userId, userId),
      ),
    });
    if (!participant) throw new ForbiddenException('You are not a participant in this conversation');
  }

  async contacts(userId: string) {
    const users = await this.db.query.users.findMany({
      where: eq(schema.users.isActive, true),
      orderBy: [asc(schema.users.firstName), asc(schema.users.lastName)],
    });
    return users.filter((user) => user.id !== userId).map((user) => this.safeUser(user));
  }

  async create(dto: CreateConversationDto, userId: string) {
    const participantIds = [...new Set([userId, ...dto.participantIds])];
    const activeUsers = await this.db.query.users.findMany({
      where: and(inArray(schema.users.id, participantIds), eq(schema.users.isActive, true)),
    });
    if (activeUsers.length !== participantIds.length) {
      throw new NotFoundException('One or more conversation participants are unavailable');
    }
    return this.db.transaction(async (tx) => {
      const [conversation] = await tx.insert(schema.conversations).values({
        title: dto.title ?? null,
        createdBy: userId,
      }).returning();
      await tx.insert(schema.conversationParticipants).values(participantIds.map((participantId) => ({
        conversationId: conversation.id,
        userId: participantId,
      })));
      let initialMessage: typeof schema.messages.$inferSelect | null = null;
      if (dto.initialMessage?.trim()) {
        [initialMessage] = await tx.insert(schema.messages).values({
          conversationId: conversation.id,
          senderId: userId,
          content: dto.initialMessage.trim(),
        }).returning();
      }
      return { conversation, participants: activeUsers.map((user) => this.safeUser(user)), initialMessage };
    });
  }

  async list(userId: string) {
    const memberships = await this.db.query.conversationParticipants.findMany({
      where: eq(schema.conversationParticipants.userId, userId),
    });
    if (!memberships.length) return [];
    const conversationIds = memberships.map((item) => item.conversationId);
    const conversations = await this.db.query.conversations.findMany({
      where: inArray(schema.conversations.id, conversationIds),
      orderBy: [desc(schema.conversations.updatedAt)],
    });
    const participants = await this.db.query.conversationParticipants.findMany({
      where: inArray(schema.conversationParticipants.conversationId, conversationIds),
    });
    const participantUsers = await this.db.query.users.findMany({
      where: inArray(schema.users.id, [...new Set(participants.map((item) => item.userId))]),
    });
    return conversations.map((conversation) => ({
      ...conversation,
      participants: participants
        .filter((item) => item.conversationId === conversation.id)
        .map((item) => participantUsers.find((user) => user.id === item.userId))
        .filter((user): user is typeof participantUsers[number] => Boolean(user))
        .map((user) => this.safeUser(user)),
    }));
  }

  async history(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    return this.db.query.messages.findMany({
      where: eq(schema.messages.conversationId, conversationId),
      orderBy: [asc(schema.messages.createdAt)],
      limit: 500,
    });
  }

  async send(conversationId: string, dto: SendMessageDto, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const now = new Date();
    return this.db.transaction(async (tx) => {
      const [message] = await tx.insert(schema.messages).values({
        conversationId,
        senderId: userId,
        type: dto.type ?? 'TEXT',
        content: dto.content.trim(),
        createdAt: now,
      }).returning();
      await tx.update(schema.conversations).set({ updatedAt: now }).where(eq(schema.conversations.id, conversationId));
      return message;
    });
  }

  async markRead(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);
    const history = await this.db.query.messages.findMany({
      where: eq(schema.messages.conversationId, conversationId),
    });
    const messageIds = history.filter((message) => message.senderId !== userId).map((message) => message.id);
    if (!messageIds.length) return { markedRead: 0 };
    const existing = await this.db.query.messageReadStates.findMany({
      where: and(
        eq(schema.messageReadStates.userId, userId),
        inArray(schema.messageReadStates.messageId, messageIds),
      ),
    });
    const seen = new Set(existing.map((item) => item.messageId));
    const unread = messageIds.filter((id) => !seen.has(id));
    if (unread.length) {
      await this.db.insert(schema.messageReadStates).values(unread.map((messageId) => ({ messageId, userId })));
    }
    return { markedRead: unread.length };
  }

  private safeUser(user: typeof schema.users.$inferSelect) {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      depotId: user.depotId,
      outletId: user.outletId,
    };
  }
}
