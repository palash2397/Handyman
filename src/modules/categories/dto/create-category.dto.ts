import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryStatus } from '../schemas/category.schema';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Plumbing',
    description: 'Name of the service category',
  })
  @IsNotEmpty({ message: 'Category name is required' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'plumbing',
    description: 'URL-friendly slug (auto-generated if omitted)',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: 'Professional plumbing repairs, leak detection, and installations.',
    description: 'Category description',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Category icon file to upload (PNG, JPG, SVG, WEBP)',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  icon?: any;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Category banner / card image file to upload (PNG, JPG, WEBP)',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({
    example: ['Pipe Leak Repair', 'Drain Cleaning', 'Tap Installation', 'Water Heater Repair'],
    description: 'List of granular skills / sub-services (array or comma-separated)',
    type: [String],
  })
  @Transform(({ value }) => {
    if (!value || value === '') return undefined;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return value
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
    }
    if (Array.isArray(value)) return value.filter(Boolean);
    return [value];
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiPropertyOptional({
    enum: CategoryStatus,
    example: CategoryStatus.ACTIVE,
    description: 'Status of the category (ACTIVE or INACTIVE)',
  })
  @Transform(({ value }) => (value === '' ? undefined : value))
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order priority',
    type: Number,
  })
  @Transform(({ value }) =>
    value === '' || value === undefined ? undefined : Number(value),
  )
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to highlight on mobile homepage',
    type: Boolean,
  })
  @Transform(({ value }) => {
    if (value === '' || value === undefined) return undefined;
    if (value === 'true' || value === true || value === 1 || value === '1')
      return true;
    if (value === 'false' || value === false || value === 0 || value === '0')
      return false;
    return value;
  })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;
}
