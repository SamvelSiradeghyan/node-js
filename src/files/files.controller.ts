import { BadRequestException, Body, Controller, Get, HttpStatus, Param, Patch, Post, Query, Req, Res, UsePipes, ValidationPipe } from "@nestjs/common";
import { FilesService } from "./files.service";
import { CreateFileDto } from "./dto/create-file.dto";
import { Response, Request } from 'express';
import { QueryFilesDto } from "./dto/query-files.dto";

@Controller('files')
export class FilesController {
    constructor(private readonly files: FilesService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    async create(@Body() dto: CreateFileDto, @Res() res: Response) {
        const created = await this.files.create(dto);
        res.status(HttpStatus.CREATED).setHeader('Location', `/files/${created.file_id}`).json(created);
    }

    @Get(':id')
    async getById(@Param('id') id: string) {
        return this.files.getById(id);
    }

    @Get()
    @UsePipes(new ValidationPipe({ transform: true }))
    async list(@Query() q: QueryFilesDto) {
        const { data, next_cursor, limit } = await this.files.list(q);
        return { data, page: { limit, next_cursor: next_cursor ?? null } };
    }

    @Patch(':id')
    async patchTags(@Param('id') id: string, @Req() req: Request) {
        const ct = req.headers['content-type'] || '';
        if (!ct.toLowerCase().startsWith('application/merge-patch+json')) {
            throw new BadRequestException('Content-Type must be application/merge-patch+json');
        }
        const body = (req as any).body;
        const updated = await this.files.mergePatchTags(id, body);
        return updated;
    }
}