import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsNotEmpty()
  author!: string;

  @IsString()
  @IsOptional()
  isbn?: string;

  @IsString()
  @IsOptional()
  publisher?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1000)
  @IsOptional()
  publicationYear?: number;
}

export class QueryBookDto {
  @IsString()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  isbn?: string;
}
