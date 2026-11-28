import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiQuery,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryStatus } from './schemas/category.schema';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { UserRole } from '../../types/enums';

const categoryStorage = diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = './uploads/categories';
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    const baseName = file.originalname
      .replace(ext, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${baseName}-${uniqueSuffix}${ext}`);
  },
});

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'icon', maxCount: 1 },
      ],
      {
        storage: categoryStorage,
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: CreateCategoryDto })
  @HttpCode(HttpStatus.OK)
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Category created successfully (Admin only)',
  })
  @SwaggerResponse({
    status: HttpStatus.CONFLICT,
    description: 'Category already exists',
  })
  @SwaggerResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin role required',
  })
  async create(
    @Body() createCategoryDto: CreateCategoryDto,
    @UploadedFiles()
    files?: {
      image?: any[];
      icon?: any[];
    },
  ) {
    if (files?.image && files.image[0]) {
      createCategoryDto.image = files.image[0].filename;
    } else if (createCategoryDto.image === '') {
      delete createCategoryDto.image;
    }
    if (files?.icon && files.icon[0]) {
      createCategoryDto.icon = files.icon[0].filename;
    } else if (createCategoryDto.icon === '') {
      delete createCategoryDto.icon;
    }

    if (typeof (createCategoryDto.skills as any) === 'string') {
      try {
        createCategoryDto.skills = JSON.parse(
          createCategoryDto.skills as unknown as string,
        );
      } catch {
        createCategoryDto.skills = (
          createCategoryDto.skills as unknown as string
        )
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    if (typeof (createCategoryDto as any).isPopular === 'string') {
      createCategoryDto.isPopular =
        (createCategoryDto as any).isPopular === 'true';
    }
    if (typeof (createCategoryDto as any).order === 'string') {
      createCategoryDto.order = parseInt(
        (createCategoryDto as any).order,
        10,
      );
    }

    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CategoryStatus,
    description: 'Filter categories by status (ACTIVE or INACTIVE)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search categories by name, description, or skill',
  })
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Categories fetched successfully',
  })
  async findAll(
    @Query('status') status?: CategoryStatus,
    @Query('search') search?: string,
  ) {
    return this.categoriesService.findAll({ status, search });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Category fetched successfully',
  })
  @SwaggerResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  async findById(@Param('id') id: string) {
    return this.categoriesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'image', maxCount: 1 },
        { name: 'icon', maxCount: 1 },
      ],
      {
        storage: categoryStorage,
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: UpdateCategoryDto })
  @HttpCode(HttpStatus.OK)
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully (Admin only)',
  })
  @SwaggerResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @SwaggerResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin role required',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
    @UploadedFiles()
    files?: {
      image?: any[];
      icon?: any[];
    },
  ) {
    if (files?.image && files.image[0]) {
      updateCategoryDto.image = files.image[0].filename;
    } else if (updateCategoryDto.image === '') {
      delete updateCategoryDto.image;
    }
    if (files?.icon && files.icon[0]) {
      updateCategoryDto.icon = files.icon[0].filename;
    } else if (updateCategoryDto.icon === '') {
      delete updateCategoryDto.icon;
    }

    if (typeof (updateCategoryDto.skills as any) === 'string') {
      try {
        updateCategoryDto.skills = JSON.parse(
          updateCategoryDto.skills as unknown as string,
        );
      } catch {
        updateCategoryDto.skills = (
          updateCategoryDto.skills as unknown as string
        )
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }
    if (typeof (updateCategoryDto as any).isPopular === 'string') {
      updateCategoryDto.isPopular =
        (updateCategoryDto as any).isPopular === 'true';
    }
    if (typeof (updateCategoryDto as any).order === 'string') {
      updateCategoryDto.order = parseInt(
        (updateCategoryDto as any).order,
        10,
      );
    }

    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @SwaggerResponse({
    status: HttpStatus.OK,
    description: 'Category deleted successfully (Admin only)',
  })
  @SwaggerResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Category not found',
  })
  @SwaggerResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin role required',
  })
  async delete(@Param('id') id: string) {
    return this.categoriesService.delete(id);
  }
}
