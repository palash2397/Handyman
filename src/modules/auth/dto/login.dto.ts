import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin@yopmail.com',
    description: 'Registered email address',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: 'admin1234',
    description: 'Account password',
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  password: string;
}
