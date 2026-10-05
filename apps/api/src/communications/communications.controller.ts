import { Body, Controller, Get, Param, ParseBoolPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateConversationDto, SendMessageDto } from './dto/communications.dto';
import { MessagesService } from './messages.service';
import { NotificationsService } from './notifications.service';

@ApiTags('Messages & Notifications')
@ApiBearerAuth()
@Controller()
export class CommunicationsController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get('messages/conversations')
  listConversations(@CurrentUser('id') userId: string) {
    return this.messagesService.list(userId);
  }

  @Get('messages/contacts')
  listContacts(@CurrentUser('id') userId: string) {
    return this.messagesService.contacts(userId);
  }

  @Post('messages/conversations')
  createConversation(@Body() dto: CreateConversationDto, @CurrentUser('id') userId: string) {
    return this.messagesService.create(dto, userId);
  }

  @Get('messages/conversations/:id')
  getMessages(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.messagesService.history(id, userId);
  }

  @Post('messages/conversations/:id')
  sendMessage(@Param('id') id: string, @Body() dto: SendMessageDto, @CurrentUser('id') userId: string) {
    return this.messagesService.send(id, dto, userId);
  }

  @Post('messages/conversations/:id/read')
  markConversationRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.messagesService.markRead(id, userId);
  }

  @Get('notifications')
  listNotifications(
    @CurrentUser('id') userId: string,
    @Query('unreadOnly', new ParseBoolPipe({ optional: true })) unreadOnly?: boolean,
  ) {
    return this.notificationsService.list(userId, unreadOnly);
  }

  @Post('notifications/:id/read')
  markNotificationRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markRead(id, userId);
  }
}
