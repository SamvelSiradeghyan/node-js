import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfigService {
    get port(): number {
        return parseInt(process.env.PORT || '3000', 10);
    }

    get databaseUrl(): string {
        return process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/filemeta';
    }
}