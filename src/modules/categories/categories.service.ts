import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import {
  Category,
  CategoryDocument,
  CategoryStatus,
} from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiResponse } from '../../helpers/ApiResponse';
import { Msg } from '../../helpers/responseMsg';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-');
  }

  private formatCategory(category: CategoryDocument | any) {
    if (!category) return null;
    const catObj = category.toObject ? category.toObject() : { ...category };

    const rawBaseUrl = process.env.BASE_URL || 'http://localhost:4022';
    const baseUrl = rawBaseUrl.replace(/\/+$/, '');

    const formatUrl = (filename?: string) => {
      if (!filename) return '';
      if (filename.startsWith('http://') || filename.startsWith('https://')) {
        return filename;
      }
      const clean = filename
        .replace(/^\/+/, '')
        .replace(/^uploads\/categories\//, '');
      return `${baseUrl}/uploads/categories/${clean}`;
    };

    return {
      ...catObj,
      imageName: catObj.image || '',
      iconName: catObj.icon || '',
      image: formatUrl(catObj.image),
      icon: formatUrl(catObj.icon),
    };
  }

  async create(dto: CreateCategoryDto) {
    try {
      const slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);

      const existing = await this.categoryModel.findOne({
        $or: [{ slug }, { name: new RegExp(`^${dto.name.trim()}$`, 'i') }],
      });

      if (existing) {
        return new ApiResponse(409, {}, Msg.CATEGORY_EXISTS);
      }

      const created = await this.categoryModel.create({
        ...dto,
        slug,
      });

      return new ApiResponse(201, this.formatCategory(created), Msg.CATEGORY_ADDED);
    } catch (error) {
      console.error('create category error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async findAll(query?: { status?: CategoryStatus; search?: string }) {
    try {
      const filter: any = {};

      if (query?.status) {
        filter.status = query.status;
      }

      if (query?.search) {
        filter.$or = [
          { name: { $regex: query.search.trim(), $options: 'i' } },
          { description: { $regex: query.search.trim(), $options: 'i' } },
          { skills: { $regex: query.search.trim(), $options: 'i' } },
        ];
      }

      const categories = await this.categoryModel
        .find(filter)
        .sort({ order: 1, name: 1 })
        .exec();

      const formatted = categories.map((cat) => this.formatCategory(cat));
      return new ApiResponse(200, formatted, Msg.CATEGORIES_FETCHED);
    } catch (error) {
      console.error('findAll categories error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async findById(id: string) {
    try {
      if (!isValidObjectId(id)) {
        return new ApiResponse(400, {}, 'Invalid category ID');
      }

      const category = await this.categoryModel.findById(id).exec();
      if (!category) {
        return new ApiResponse(404, {}, Msg.CATEGORY_NOT_FOUND);
      }

      return new ApiResponse(200, this.formatCategory(category), Msg.CATEGORY_FETCHED);
    } catch (error) {
      console.error('findById category error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    try {
      if (!isValidObjectId(id)) {
        return new ApiResponse(400, {}, 'Invalid category ID');
      }

      const category = await this.categoryModel.findById(id);
      if (!category) {
        return new ApiResponse(404, {}, Msg.CATEGORY_NOT_FOUND);
      }

      let slug = category.slug;
      if (dto.name && dto.name.toLowerCase() !== category.name.toLowerCase()) {
        slug = dto.slug ? this.slugify(dto.slug) : this.slugify(dto.name);
        const duplicate = await this.categoryModel.findOne({
          _id: { $ne: id },
          $or: [{ slug }, { name: new RegExp(`^${dto.name.trim()}$`, 'i') }],
        });
        if (duplicate) {
          return new ApiResponse(409, {}, Msg.CATEGORY_EXISTS);
        }
      }

      const updated = await this.categoryModel
        .findByIdAndUpdate(
          id,
          { ...dto, slug },
          { returnDocument: 'after' },
        )
        .exec();

      return new ApiResponse(200, this.formatCategory(updated), Msg.CATEGORY_UPDATED);
    } catch (error) {
      console.error('update category error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }

  async delete(id: string) {
    try {
      if (!isValidObjectId(id)) {
        return new ApiResponse(400, {}, 'Invalid category ID');
      }

      const category = await this.categoryModel.findByIdAndDelete(id).exec();
      if (!category) {
        return new ApiResponse(404, {}, Msg.CATEGORY_NOT_FOUND);
      }

      return new ApiResponse(200, {}, Msg.CATEGORY_DELETED);
    } catch (error) {
      console.error('delete category error:', error);
      return new ApiResponse(500, {}, Msg.SERVER_ERROR);
    }
  }
}
