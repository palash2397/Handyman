import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole, UserStatus, OtpType } from '../../types/enums';
import { generateOtp, getExpirationTime } from '../../helpers';
import { Msg } from '../../helpers/responseMsg';
import { ApiResponse } from '../../helpers/ApiResponse';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    try {
      if ((dto.role as any) === UserRole.ADMIN) {
        return new ApiResponse(403, {}, Msg.FORBIDDEN);
      }

      if (dto.role === UserRole.COMPANY && !dto.companyName) {
        return new ApiResponse(
          400,
          {},
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
        otpType: OtpType.ACCOUNT_VERIFICATION,
      });

      const data = {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        onboardingStep: user.onboardingStep,
        otp, // provided in response for development/testing convenience
      };

      return new ApiResponse(201, data, Msg.OTP_SENT);
    } catch (error) {
      console.error('Registration error:', error);
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

      // Check if user is email verified - unverified users cannot login
      if (!user.isEmailVerified) {
        return new ApiResponse(403, {}, Msg.USER_NOT_VERIFIED);
      }

      if (user.status === UserStatus.SUSPENDED) {
        return new ApiResponse(403, {}, Msg.ACCOUNT_DEACTIVATED);
      }

      const payload = {
        sub: user._id,
        email: user.email,
        role: user.role,
        roles: [user.role],
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
      console.error('Login error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    try {
      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      if (user.status === UserStatus.SUSPENDED) {
        return new ApiResponse(403, {}, Msg.ACCOUNT_DEACTIVATED);
      }

      if (!user.isEmailVerified) {
        return new ApiResponse(403, {}, Msg.USER_NOT_VERIFIED);
      }

      const otp = generateOtp();
      const otpExpiresAt = getExpirationTime();

      await this.usersService.update(user._id.toString(), {
        otp,
        otpExpiresAt,
        otpType: OtpType.FORGOT_PASSWORD,
        isForgotPassword: false,
      });

      const data = {
        email: user.email,
        otp, // provided in response for development/testing convenience
      };

      return new ApiResponse(200, data, Msg.OTP_SENT);
    } catch (error) {
      console.error('forgotPassword error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async verifyOtp(dto: VerifyOtpDto) {
    try {
      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      if (!user.otp || user.otp !== dto.otp) {
        return new ApiResponse(400, {}, Msg.OTP_INVALID);
      }

      if (user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
        return new ApiResponse(400, {}, Msg.OTP_EXPIRED);
      }

      // Determine the purpose of this OTP verification
      const targetType =
        dto.type ||
        user.otpType ||
        (user.isEmailVerified
          ? OtpType.FORGOT_PASSWORD
          : OtpType.ACCOUNT_VERIFICATION);

      if (targetType === OtpType.FORGOT_PASSWORD) {
        await this.usersService.update(user._id.toString(), {
          $unset: {
            otp: 1,
            otpExpiresAt: 1,
            otpType: 1,
            resetPasswordOtp: 1,
            resetPasswordExpiresAt: 1,
          },
          isForgotPassword: true,
        });

        const data = {
          email: user.email,
        };

        return new ApiResponse(200, data, Msg.OTP_VERIFIED);
      } else {
        // Account verification flow: mark email verified and log user in
        if (user.isEmailVerified) {
          return new ApiResponse(400, {}, Msg.USER_ALREADY_VERIFIED);
        }

        const updatedUser = await this.usersService.update(
          user._id.toString(),
          {
            isEmailVerified: true,
            $unset: { otp: 1, otpExpiresAt: 1, otpType: 1 },
          },
        );

        const payload = {
          sub: user._id,
          email: user.email,
          role: user.role,
        };

        const accessToken = await this.jwtService.signAsync(payload);

        const data = {
          accessToken,
          user: {
            id: updatedUser?._id || user._id,
            name: updatedUser?.name || user.name,
            email: updatedUser?.email || user.email,
            phone: updatedUser?.phone || user.phone,
            role: updatedUser?.role || user.role,
            status: updatedUser?.status || user.status,
            onboardingStep: updatedUser?.onboardingStep || user.onboardingStep,
            isEmailVerified: true,
            isPhoneVerified:
              updatedUser?.isPhoneVerified || user.isPhoneVerified,
          },
        };

        return new ApiResponse(200, data, Msg.OTP_VERIFIED);
      }
    } catch (error) {
      console.error('verifyOtp error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async resendOtp(dto: ResendOtpDto) {
    try {
      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      // Determine the purpose of this OTP resend
      const targetType =
        dto.type ||
        user.otpType ||
        (user.isEmailVerified
          ? OtpType.FORGOT_PASSWORD
          : OtpType.ACCOUNT_VERIFICATION);

      if (targetType === OtpType.ACCOUNT_VERIFICATION && user.isEmailVerified) {
        return new ApiResponse(400, {}, Msg.USER_ALREADY_VERIFIED);
      }

      const otp = generateOtp();
      const otpExpiresAt = getExpirationTime();

      await this.usersService.update(user._id.toString(), {
        otp,
        otpExpiresAt,
        otpType: targetType,
      });

      const data = {
        email: user.email,
        otp, // provided in response for development/testing convenience
      };

      return new ApiResponse(200, data, Msg.OTP_RESENT);
    } catch (error) {
      console.error('resendOtp error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    try {
      if (dto.newPassword !== dto.confirmPassword) {
        return new ApiResponse(
          400,
          {},
          'New password and confirm password do not match',
        );
      }

      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      if (!user.isForgotPassword) {
        return new ApiResponse(400, {}, Msg.OTP_NOT_VERIFIED);
      }

      // Check if new password matches old password
      const isSamePassword = await bcrypt.compare(
        dto.newPassword,
        user.password,
      );
      if (isSamePassword) {
        return new ApiResponse(400, {}, Msg.ENTERED_OLD_PASSWORD);
      }

      // Hash new password and save
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

      await this.usersService.update(user._id.toString(), {
        password: hashedPassword,
        isForgotPassword: false,
        $unset: {
          resetPasswordOtp: 1,
          resetPasswordExpiresAt: 1,
          otp: 1,
          otpExpiresAt: 1,
          otpType: 1,
        },
      });

      return new ApiResponse(200, {}, Msg.PASSWORD_CHANGED);
    } catch (error) {
      console.error('resetPassword error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async changePassword(dto: ChangePasswordDto) {
    try {
      if (dto.newPassword !== dto.confirmPassword) {
        return new ApiResponse(400, {}, Msg.PASSWORD_MISSMATCH);
      }

      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      const isOldPasswordValid = await bcrypt.compare(
        dto.oldPassword,
        user.password,
      );
      if (!isOldPasswordValid) {
        return new ApiResponse(400, {}, Msg.PASSWORD_OLD_INCORRECT);
      }

      // Check if new password matches old password
      const isSamePassword = await bcrypt.compare(
        dto.newPassword,
        user.password,
      );
      if (isSamePassword) {
        return new ApiResponse(400, {}, Msg.ENTERED_OLD_PASSWORD);
      }

      // Hash new password and save
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(dto.newPassword, salt);

      await this.usersService.update(user._id.toString(), {
        password: hashedPassword,
      });

      return new ApiResponse(200, {}, Msg.PASSWORD_CHANGED);
    } catch (error) {
      console.error('changePassword error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async getProfile(userId: string) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      const data = {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        onboardingStep: user.onboardingStep,
        profileImage: user.profileImage,
        bio: user.bio,
        gender: user.gender,
        dob: user.dob,
        address: user.address,
        languages: user.languages || [],
        experienceYears: user.experienceYears,
        companyName: user.companyName,
        authorizedPersonName: user.authorizedPersonName,
        createdAt: (user as any).createdAt,
        updatedAt: (user as any).updatedAt,
      };

      return new ApiResponse(200, data, Msg.USER_FETCHED);
    } catch (error) {
      console.error('getProfile error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      const user = await this.usersService.findById(userId);
      if (!user) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      if (dto.phone && dto.phone !== user.phone) {
        const existingPhone = await this.usersService.findByPhone(dto.phone);
        if (
          existingPhone &&
          existingPhone._id.toString() !== user._id.toString()
        ) {
          return new ApiResponse(409, {}, Msg.USER_PHONE_ALREADY_EXISTS);
        }
      }

      const updatedUser = await this.usersService.update(userId, dto);
      if (!updatedUser) {
        return new ApiResponse(404, {}, Msg.USER_NOT_FOUND);
      }

      const data = {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        status: updatedUser.status,
        isEmailVerified: updatedUser.isEmailVerified,
        isPhoneVerified: updatedUser.isPhoneVerified,
        onboardingStep: updatedUser.onboardingStep,
        profileImage: updatedUser.profileImage,
        bio: updatedUser.bio,
        gender: updatedUser.gender,
        dob: updatedUser.dob,
        address: updatedUser.address,
        languages: updatedUser.languages || [],
        experienceYears: updatedUser.experienceYears,
        companyName: updatedUser.companyName,
        authorizedPersonName: updatedUser.authorizedPersonName,
        createdAt: (updatedUser as any).createdAt,
        updatedAt: (updatedUser as any).updatedAt,
      };

      return new ApiResponse(200, data, Msg.USER_UPDATED);
    } catch (error) {
      console.error('updateProfile error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
