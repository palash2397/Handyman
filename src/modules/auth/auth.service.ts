import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole, UserStatus } from '../../types/enums';
import { generateOtp, getExpirationTime } from '../../helpers';
import { Msg } from '../../helpers/responseMsg';
import { ApiResponse } from 'src/helpers/ApiResponse';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      if ((dto.role as any) === UserRole.ADMIN) {
        return new ApiResponse(404, {}, Msg.FORBIDDEN);
      }

      if (dto.role === UserRole.COMPANY && !dto.companyName) {
        throw new BadRequestException(
          'Company name is required for COMPANY role registration',
        );
      }

      const existingEmail = await this.usersService.findByEmail(dto.email);
      if (existingEmail) {
        return new ApiResponse(409, {}, Msg.USER_EXISTS);
      }

      if (dto.phone) {
        const existingPhone = await this.usersService.findByPhone(dto.phone);
        if (existingPhone) {
          return new ApiResponse(409, {}, Msg.USER_PHONE_ALREADY_EXISTS);
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(dto.password, salt);

      const otp = generateOtp();
      const otpExpiresAt = getExpirationTime();

      const status =
        dto.role === UserRole.CUSTOMER ? UserStatus.ACTIVE : UserStatus.PENDING;

      const user = await this.usersService.create({
        name: dto.name,
        email: dto.email.toLowerCase().trim(),
        phone: dto.phone,
        password: hashedPassword,
        role: dto.role,
        status,
        isEmailVerified: false,
        isPhoneVerified: false,
        onboardingStep: 1,
        companyName: dto.companyName,
        authorizedPersonName: dto.authorizedPersonName,
        otp,
        otpExpiresAt,
      });

      const data = {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        onboardingStep: user.onboardingStep,
        otp, // provided in response for development convenience
      };

      return new ApiResponse(201, data, Msg.OTP_SENT);
    } catch (error) {
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.password);
      if (!isPasswordValid) {
        return new ApiResponse(401, {}, Msg.INVALID_CREDENTIALS);
      }

      if (user.status === UserStatus.SUSPENDED) {
        return new ApiResponse(403, {}, Msg.ACCOUNT_DEACTIVATED);
      }

      const payload = {
        sub: user._id,
        email: user.email,
        role: user.role,
      };

      const accessToken = await this.jwtService.signAsync(payload);
      const data = {
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          onboardingStep: user.onboardingStep,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
        },
      };

      return new ApiResponse(200, data, Msg.LOGIN_SUCCESS);
    } catch (error) {
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
