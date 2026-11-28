import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

export enum CategoryStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Schema({ timestamps: true, collection: 'categories' })
export class Category {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  slug: string;

  @Prop({ trim: true, default: '' })
  description?: string;

  @Prop({ trim: true, default: '' })
  icon?: string;

  @Prop({ trim: true, default: '' })
  image?: string;

  @Prop({ type: [String], default: [] })
  skills?: string[];

  @Prop({ type: String, enum: CategoryStatus, default: CategoryStatus.ACTIVE, index: true })
  status: CategoryStatus;

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Boolean, default: false })
  isPopular: boolean;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Indexes
CategorySchema.index({ name: 'text', description: 'text' });
