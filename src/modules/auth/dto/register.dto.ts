import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../types/enums';

export class RegisterDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsNotEmpty({ message: 'Name is required' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email address',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'User phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    example: 'password123',
    description: 'Account password (minimum 6 characters)',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string;

  @ApiProperty({
    enum: [UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.COMPANY],
    example: UserRole.CUSTOMER,
    description: 'Role of the user registering',
  })
  @IsNotEmpty({ message: 'Role is required' })
  @IsEnum([UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.COMPANY], {
    message: 'Role must be CUSTOMER, PROVIDER, or COMPANY',
  })
  role: UserRole;

  @ApiPropertyOptional({
    example: 'FixIt Pro LLC',
    description: 'Company name (required if role is COMPANY)',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: 'Jane Doe',
    description: 'Authorized representative name (if role is COMPANY)',
  })
  @IsOptional()
  @IsString()
  authorizedPersonName?: string;
}
