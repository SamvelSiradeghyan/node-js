import { ArrayMaxSize, IsArray, IsBase64, IsInt, IsNotEmpty, IsOptional, IsString, Min, ValidateIf } from "class-validator";

export class CreateFileDto {
    @IsString()
    @IsNotEmpty()
    user_id!: string;

    @IsString()
    @IsNotEmpty()
    filename!: string;

    @IsInt()
    @Min(0)
    size_bytes!: number;

    @IsString()
    @IsNotEmpty()
    content_type!: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @ArrayMaxSize(100)
    tags?: string[];

    // One of checksum_sha256 OR content_base64 is required. If both, we verify they match.
    @ValidateIf(o => !o.content_base64) @IsString() @IsNotEmpty()
    checksum_sha256?: string;

    @ValidateIf(o => !o.checksum_sha256) @IsBase64()
    content_base64?: string;

    @IsOptional() @IsString()
    storage_key?: string;
}