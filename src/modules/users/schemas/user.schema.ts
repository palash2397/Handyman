import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { UserRole, UserStatus, OtpType } from '../../../types/enums';

export type UserDocument = User & Document;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  })
  email: string;

  @Prop({ sparse: true, trim: true })
  phone?: string;

  @Prop({ required: true })
  password: string;

  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.CUSTOMER,
    index: true,
  })
  role: UserRole;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
    index: true,
  })
  status: UserStatus;

  @Prop({ default: false })
  isEmailVerified: boolean;

  @Prop({ default: false })
  isPhoneVerified: boolean;

  @Prop({ default: 1 })
  onboardingStep: number;

  @Prop({ trim: true })
  companyName?: string;

  @Prop({ trim: true })
  authorizedPersonName?: string;

  @Prop({ trim: true })
  profileImage?: string;

  @Prop({ trim: true })
  bio?: string;

  @Prop({ trim: true })
  gender?: string;

  @Prop({ trim: true })
  dob?: string;

  @Prop({
    type: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      latitude: { type: Number },
      longitude: { type: Number },
    },
    _id: false,
  })
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
    latitude?: number;
    longitude?: number;
  };

  @Prop({ type: [String], default: [] })
  languages?: string[];

  @Prop()
  experienceYears?: number;

  @Prop()
  otp?: string;

  @Prop()
  otpExpiresAt?: Date;

  @Prop({ type: String, enum: OtpType, default: OtpType.ACCOUNT_VERIFICATION })
  otpType?: OtpType;

  @Prop()
  resetPasswordOtp?: string;

  @Prop()
  resetPasswordExpiresAt?: Date;

  @Prop({ default: false })
  isForgotPassword?: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Ensure index on email and role
UserSchema.index({ email: 1, role: 1 });
