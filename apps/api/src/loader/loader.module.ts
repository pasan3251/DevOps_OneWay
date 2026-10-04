import { Module } from '@nestjs/common';
import { LoaderService } from './loader.service';
import { LoaderController } from './loader.controller';

@Module({
  controllers: [LoaderController],
  providers: [LoaderService],
  exports: [LoaderService],
})
export class LoaderModule {}
