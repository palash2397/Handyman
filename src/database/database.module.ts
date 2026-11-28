import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSeeder } from './seeders/admin.seeder';
import { CategoriesSeeder } from './seeders/categories.seeder';
import { User, UserSchema } from '../modules/users/schemas/user.schema';
import { Category, CategorySchema } from '../modules/categories/schemas/category.schema';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI!, {
      maxPoolSize: 100,
      minPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Category.name, schema: CategorySchema },
    ]),
  ],
  providers: [AdminSeeder, CategoriesSeeder],
  exports: [AdminSeeder, CategoriesSeeder],
})
export class DatabaseModule {}
