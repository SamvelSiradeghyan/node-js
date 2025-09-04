import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './database/database.module';
import { FilesModule } from './files/files.module';

@Module({
    imports: [ConfigModule, DatabaseModule, FilesModule],
})
export class AppModule { }