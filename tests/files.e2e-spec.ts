import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Client } from 'pg';

async function waitForPg(url: string, attempts = 20, delayMs = 300) {
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
        try {
            const c = new Client({ connectionString: url });
            await c.connect();
            await c.query('SELECT 1');
            await c.end();
            return;
        } catch (e) {
            lastErr = e;
            await new Promise(r => setTimeout(r, delayMs));
        }
    }
    throw lastErr;
}

describe('Files API (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        await waitForPg(process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/filemeta');

        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('POST /files then GET /files/:id', async () => {
        const created = await request(app.getHttpServer())
            .post('/files')
            .send({
                user_id: 'test_user',
                filename: 'hello.txt',
                size_bytes: 12,
                content_type: 'text/plain',
                content_base64: Buffer.from('hello world!').toString('base64'),
                tags: ['test', 'docs']
            })
            .expect(201);

        const id = created.body.file_id;

        await request(app.getHttpServer())
            .get(`/files/${id}`)
            .expect(200);
    });
});
