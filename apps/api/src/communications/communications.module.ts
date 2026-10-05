import { Global, Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { MessagesService } from './messages.service';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  controllers: [CommunicationsController],
  providers: [MessagesService, NotificationsService],
  exports: [MessagesService, NotificationsService],
})
export class CommunicationsModule {}
