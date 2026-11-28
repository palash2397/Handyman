import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Category,
  CategoryDocument,
  CategoryStatus,
} from '../../modules/categories/schemas/category.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CategoriesSeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(CategoriesSeeder.name);

  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async onApplicationBootstrap() {
    await this.copyLocalAssets();
    await this.seedCategories();
  }

  private async copyLocalAssets() {
    try {
      const sourceDir = path.join(process.cwd(), 'categories');
      const targetDir = path.join(process.cwd(), 'uploads', 'categories');

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      if (fs.existsSync(sourceDir)) {
        const files = fs.readdirSync(sourceDir);
        for (const file of files) {
          const srcFile = path.join(sourceDir, file);
          const destFile = path.join(targetDir, file);
          if (fs.statSync(srcFile).isFile() && !fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
          }
        }
      }
    } catch (err) {
      this.logger.warn('Could not copy categories assets to uploads:', err);
    }
  }

  private async seedCategories() {
    const initialCategories = [
      {
        name: 'Plumbing',
        slug: 'plumbing',
        description:
          'Expert leak detection, pipe repair, drain unclogging, and sanitary installations.',
        image: 'Plumbing.png',
        icon: 'Plumbing.png',
        skills: [
          'Pipe Leak Repair',
          'Drain Unclogging',
          'Tap & Mixer Installation',
          'Water Heater Repair',
          'Toilet & Cistern Repair',
        ],
        status: CategoryStatus.ACTIVE,
        order: 1,
        isPopular: true,
      },
      {
        name: 'Electrical',
        slug: 'electrical',
        description:
          'Licensed wiring, switchboard setup, lighting fixtures, and circuit fault repairs.',
        image: 'Electrical.png',
        icon: 'Electrical.png',
        skills: [
          'Wiring & Rewiring',
          'Switchboard & Socket Repair',
          'Ceiling Fan & Light Fixtures',
          'Circuit Breaker / Fuse Repair',
          'Appliance Installation',
        ],
        status: CategoryStatus.ACTIVE,
        order: 2,
        isPopular: true,
      },
      {
        name: 'Cleaning',
        slug: 'cleaning',
        description:
          'Deep home cleaning, sofa and carpet sanitization, kitchen and bathroom scrubbing.',
        image: 'Cleaning.png',
        icon: 'Cleaning.png',
        skills: [
          'Full Home Deep Cleaning',
          'Sofa & Upholstery Cleaning',
          'Kitchen Deep Clean',
          'Bathroom Sanitization',
          'Carpet Cleaning',
        ],
        status: CategoryStatus.ACTIVE,
        order: 3,
        isPopular: true,
      },
      {
        name: 'HVAC',
        slug: 'hvac',
        description:
          'Heating, ventilation, AC deep cleaning, gas refill, and cooling maintenance.',
        image: 'HVAC.png',
        icon: 'HVAC.png',
        skills: [
          'AC Deep Cleaning',
          'Gas Refill & Leak Check',
          'Compressor Repair',
          'Thermostat Installation',
          'Duct Inspection',
        ],
        status: CategoryStatus.ACTIVE,
        order: 4,
        isPopular: true,
      },
      {
        name: 'Appliance Repair',
        slug: 'appliance-repair',
        description:
          'Fast repairs for refrigerators, washing machines, microwaves, and home appliances.',
        image: 'Appliance Repair.png',
        icon: 'Appliance Repair.png',
        skills: [
          'Refrigerator Repair',
          'Washing Machine Service',
          'Microwave Repair',
          'Dishwasher Service',
          'Oven Repair',
        ],
        status: CategoryStatus.ACTIVE,
        order: 5,
        isPopular: true,
      },
      {
        name: 'Carpentry',
        slug: 'carpentry',
        description:
          'Woodwork repairs, furniture assembly, custom cabinetry, and door/window fitting.',
        image: 'Carpentry.png',
        icon: 'Carpentry.png',
        skills: [
          'Furniture Assembly',
          'Door & Lock Repair',
          'Cabinet Installation',
          'Wooden Flooring',
          'Custom Woodwork',
        ],
        status: CategoryStatus.ACTIVE,
        order: 6,
        isPopular: false,
      },
      {
        name: 'Painting',
        slug: 'painting',
        description:
          'Interior and exterior wall painting, waterproofing, and surface preparation.',
        image: 'Painting.png',
        icon: 'Painting.png',
        skills: [
          'Interior Wall Painting',
          'Exterior House Painting',
          'Waterproofing & Primer',
          'Wallpaper Installation',
          'Wood & Metal Polish',
        ],
        status: CategoryStatus.ACTIVE,
        order: 7,
        isPopular: false,
      },
      {
        name: 'Gardening',
        slug: 'gardening',
        description:
          'Lawn mowing, plant maintenance, garden landscaping, hedge trimming, and weeding.',
        image: 'Gardening.png',
        icon: 'Gardening.png',
        skills: [
          'Lawn Mowing & Edging',
          'Hedge & Shrub Trimming',
          'Garden Cleanup & Weeding',
          'Planting & Potting',
          'Irrigation System Setup',
        ],
        status: CategoryStatus.ACTIVE,
        order: 8,
        isPopular: false,
      },
      {
        name: 'Home Service',
        slug: 'home-service',
        description:
          'General handyman services, TV mounting, drilling, curtain rods, and fixtures.',
        image: 'Home Service.png',
        icon: 'Home Service.png',
        skills: [
          'TV Wall Mounting',
          'Curtain & Blind Installation',
          'Drilling & Hanging',
          'Minor Home Repairs',
          'Furniture Assembly',
        ],
        status: CategoryStatus.ACTIVE,
        order: 9,
        isPopular: true,
      },
    ];

    try {
      for (const cat of initialCategories) {
        const existing = await this.categoryModel.findOne({
          $or: [{ slug: cat.slug }, { name: cat.name }],
        });

        if (!existing) {
          await this.categoryModel.create(cat);
          this.logger.log(`✅ Seeded category: ${cat.name}`);
        } else {
          // Sync clean filenames if image was previously a hardcoded URL or empty
          if (
            !existing.image ||
            existing.image.startsWith('http') ||
            !existing.icon ||
            existing.icon.startsWith('http') ||
            existing.image !== cat.image
          ) {
            await this.categoryModel.updateOne(
              { _id: existing._id },
              { $set: { image: cat.image, icon: cat.icon } },
            );
            this.logger.log(`🔄 Updated category image filename for: ${cat.name}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to seed categories:', error);
    }
  }
}
