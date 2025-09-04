export interface FileMeta {
    file_id: string;
    user_id: string;
    filename: string;
    size_bytes: number;
    content_type: string;
    upload_time: string;
    tags: string[];
    checksum_sha256: string;
}