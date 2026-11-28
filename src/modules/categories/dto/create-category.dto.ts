import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
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
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: 'Professional plumbing repairs, leak detection, and installations.',
    description: 'Category description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/icons/plumbing.svg',
    description: 'Icon URL or SVG path for mobile UI',
  })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/images/plumbing-banner.jpg',
    description: 'Banner / card image URL',
  })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({
    example: ['Pipe Leak Repair', 'Drain Cleaning', 'Tap Installation', 'Water Heater Repair'],
    description: 'List of granular skills / sub-services',
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
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;

  @ApiPropertyOptional({
    example: 1,
    description: 'Display order priority',
  })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether to highlight on mobile homepage',
  })
  @IsOptional()
  @IsBoolean()
  isPopular?: boolean;
}
