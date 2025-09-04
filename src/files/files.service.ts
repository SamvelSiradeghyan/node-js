import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../database/database.service";
import { CreateFileDto } from "./dto/create-file.dto";
import { FileMeta } from "./entities/file-meta";
import { randomUUID, createHash } from 'crypto';
import { QueryFilesDto } from "./dto/query-files.dto";

@Injectable()
export class FilesService {
    constructor(private readonly db: DatabaseService) { }

    async create(dto: CreateFileDto): Promise<FileMeta> {
        let checksum = dto.checksum_sha256;
        if (dto.content_base64) {
            const buf = Buffer.from(dto.content_base64, 'base64');
            const sha = createHash('sha256').update(buf).digest('hex');
            if (checksum && checksum !== sha) throw new BadRequestException('checksum_sha256 mismatch');
            checksum = sha;
        }
        if (!checksum) throw new BadRequestException('Provide checksum_sha256 or content_base64');

        if (dto.tags && !Array.isArray(dto.tags)) {
            throw new BadRequestException('tags must be array of strings');
        }

        const file_id = randomUUID();
        const nowIso = toIso(new Date());

        const insertSql = `
      INSERT INTO filemeta (file_id, user_id, filename, size_bytes, content_type, upload_time, tags, checksum_sha256)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (user_id, checksum_sha256, filename) DO NOTHING
      RETURNING file_id, user_id, filename, size_bytes, content_type, upload_time, tags, checksum_sha256
    `;
        const params = [file_id, dto.user_id, dto.filename, dto.size_bytes, dto.content_type, nowIso, dto.tags ?? [], checksum];
        const res = await this.db.query(insertSql, params);
        if (res.rows.length > 0) {
            return res.rows[0];
        }

        const sel = await this.db.query(
            `SELECT file_id, user_id, filename, size_bytes, content_type, upload_time, tags, checksum_sha256
       FROM filemeta WHERE user_id = $1 AND checksum_sha256 = $2 AND filename = $3
       ORDER BY upload_time DESC LIMIT 1`,
            [dto.user_id, checksum, dto.filename]
        );
        if (sel.rows.length === 0) {
            throw new BadRequestException('Failed to create and no conflict row found');
        }
        return sel.rows[0];
    }

    async getById(id: string): Promise<FileMeta> {
        const res = await this.db.query(
            `SELECT file_id, user_id, filename, size_bytes, content_type, upload_time, tags, checksum_sha256
       FROM filemeta WHERE file_id = $1`, [id]);
        if (res.rows.length === 0) throw new NotFoundException('File not found');
        return res.rows[0];
    }

    async list(q: QueryFilesDto): Promise<{ data: FileMeta[], next_cursor?: string, limit: number }> {
        const wheres: string[] = [];
        const params: any[] = [];
        let p = 1;

        if (q.user_id) { wheres.push(`user_id = $${p++}`); params.push(q.user_id); }
        if (q.tag) { wheres.push(`tags @> ARRAY[$${p++}]`); params.push(q.tag); }
        if (q.before) { wheres.push(`upload_time < $${p++}`); params.push(q.before); }

        if (q.cursor) {
            const cur = decodeCursor(q.cursor);
            // cSpell:ignore timestamptz
            wheres.push(`(upload_time, file_id) < ($${p++}::timestamptz, $${p++}::uuid)`);
            params.push(cur.upload_time, cur.file_id);
        }

        const whereSql = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
        const limit = q.limit ?? 50;
        const sql = `
      SELECT file_id, user_id, filename, size_bytes, content_type, upload_time, tags, checksum_sha256
      FROM filemeta
      ${whereSql}
      ORDER BY upload_time DESC, file_id DESC
      LIMIT ${limit + 1}
    `;
        const res = await this.db.query(sql, params);
        let next_cursor: string | undefined = undefined;
        let rows = res.rows;
        if (rows.length > limit) {
            const last = rows[limit - 1];
            next_cursor = encodeCursor(last.upload_time, last.file_id);
            rows = rows.slice(0, limit);
        }
        return { data: rows, next_cursor, limit };
    }

    async mergePatchTags(id: string, body: any): Promise<FileMeta> {
        if (typeof body !== 'object' || body === null || Array.isArray(body)) {
            throw new BadRequestException('Merge Patch body must be a JSON object');
        }
        const keys = Object.keys(body);
        if (keys.length === 0) {
            return this.getById(id);
        }
        if (keys.some(k => k !== 'tags')) {
            throw new BadRequestException('Only the "tags" property can be patched');
        }
        let tags: string[] = [];
        if (body.tags === null) {
            tags = [];
        } else if (Array.isArray(body.tags)) {
            tags = body.tags.map((v: any) => String(v));
        } else {
            throw new BadRequestException('tags must be array or null');
        }

        const res = await this.db.query(
            `UPDATE filemeta SET tags = $1 WHERE file_id = $2
       RETURNING file_id, user_id, filename, size_bytes, content_type, upload_time, tags, checksum_sha256`,
            [tags, id]
        );
        if (res.rows.length === 0) throw new NotFoundException('File not found');
        return res.rows[0];
    }
}

function toIso(d: Date): string {
    return d.toISOString();
}

function encodeCursor(upload_time: string, file_id: string): string {
    const raw = JSON.stringify({ upload_time, file_id });
    return Buffer.from(raw, 'utf8').toString('base64url');
}

function decodeCursor(cursor: string): { upload_time: string, file_id: string } {
    try {
        const raw = Buffer.from(cursor, 'base64url').toString('utf8');
        const obj = JSON.parse(raw);
        if (typeof obj.upload_time !== 'string' || typeof obj.file_id !== 'string') throw new Error('bad cursor');
        return obj;
    } catch {
        throw new BadRequestException('Invalid cursor');
    }
}
