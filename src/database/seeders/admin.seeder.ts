import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../../modules/users/schemas/user.schema';
import { UserRole, UserStatus } from '../../types/enums';

@Injectable()
export class AdminSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const adminEmail = 'admin@yopmail.com';
    const adminPasswordPlain = 'admin1234';

    try {
      const existingAdmin = await this.userModel.findOne({ email: adminEmail });

      if (!existingAdmin) {
        this.logger.log(`No admin account found. Creating default admin (${adminEmail})...`);
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(adminPasswordPlain, saltRounds);

        await this.userModel.create({
          name: 'Super Admin',
          email: adminEmail,
          password: hashedPassword,
          role: UserRole.ADMIN,
          status: UserStatus.ACTIVE,
          isEmailVerified: true,
          isPhoneVerified: true,
          onboardingStep: 1,
        });

        this.logger.log(`✅ Default admin created successfully: ${adminEmail}`);
      } else {
        this.logger.log(`ℹ️ Admin account already exists: ${adminEmail}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to seed default admin:`, error);
    }
  }
}
