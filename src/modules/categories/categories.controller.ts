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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse as SwaggerResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryStatus } from './schemas/category.schema';
import { JwtAuthGuard } from '../auth/jwt/jwt-auth.guard';
import { RoleGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { UserRole } from '../../types/enums';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RoleGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth('access-token')
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
  async create(@Body() createCategoryDto: CreateCategoryDto) {
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
  ) {
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
