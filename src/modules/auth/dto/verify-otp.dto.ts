import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpType } from '../../../types/enums';

export class VerifyOtpDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Registered email address',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiProperty({
    example: '123456',
    description: '6-digit OTP code',
  })
  @IsNotEmpty({ message: 'OTP is required' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @ApiPropertyOptional({
    enum: OtpType,
    example: OtpType.ACCOUNT_VERIFICATION,
    description:
      'Purpose of the OTP verification (ACCOUNT_VERIFICATION or FORGOT_PASSWORD). Defaults to ACCOUNT_VERIFICATION.',
  })
  @IsOptional()
  @IsEnum(OtpType, {
    message: 'type must be either ACCOUNT_VERIFICATION or FORGOT_PASSWORD',
  })
  type?: OtpType;
}
