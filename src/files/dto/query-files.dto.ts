import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsISO8601, Min, Max } from 'class-validator';

export class QueryFilesDto {
    @IsOptional()
    @IsString()
    user_id?: string;

    @IsOptional()
    @IsString()
    tag?: string;

    @IsOptional()
    @IsISO8601()
    before?: string;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    @Max(100)
    limit?: number = 50;

    @IsOptional()
    @IsString()
    cursor?: string;
}
