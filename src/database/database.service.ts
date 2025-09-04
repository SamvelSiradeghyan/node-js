import { Injectable, OnModuleInit } from "@nestjs/common";
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from "../config/config.service";

@Injectable()
export class DatabaseService implements OnModuleInit {
    private pool: Pool;

    constructor(configService: ConfigService) {
        const url = configService.databaseUrl;
        this.pool = new Pool({ connectionString: url });
    }

    async onModuleInit() {
        const sqlPath = path.join(__dirname, '..', '..', 'database', 'migrations', '001_init.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await this.pool.query(sql);
    }

    async query(text: string, params?: any[]) {
        return this.pool.query(text, params);
    }
}