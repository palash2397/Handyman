import { IsEmail, IsEnum, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OtpType } from '../../../types/enums';

export class ResendOtpDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Registered email address',
  })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address' })
  email: string;

  @ApiPropertyOptional({
    enum: OtpType,
    example: OtpType.ACCOUNT_VERIFICATION,
    description:
      'Purpose of the OTP (ACCOUNT_VERIFICATION or FORGOT_PASSWORD). Defaults to ACCOUNT_VERIFICATION.',
  })
  @IsOptional()
  @IsEnum(OtpType, {
    message: 'type must be either ACCOUNT_VERIFICATION or FORGOT_PASSWORD',
  })
  type?: OtpType;
}
