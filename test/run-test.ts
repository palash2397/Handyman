import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { UserRole, UserStatus } from '../src/types/enums';
import { Msg } from '../src/helpers/responseMsg';

interface TestResult {
  name: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

const results: TestResult[] = [];

async function assert(name: string, condition: boolean, expected?: any, actual?: any) {
  if (condition) {
    console.log(`  \x1b[32m✔ PASS\x1b[0m: ${name}`);
    results.push({ name, passed: true });
  } else {
    console.error(`  \x1b[31m✖ FAIL\x1b[0m: ${name}`);
    console.error(`    Expected:`, expected);
    console.error(`    Actual:  `, actual);
    results.push({ name, passed: false, expected, actual });
  }
}

async function run() {
  console.log('\n=============================================');
  console.log('🚀 Booting Handyman NestJS Application for Testing...');
  console.log('=============================================\n');

  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });

  app.setGlobalPrefix('/api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const PORT = 4099;
  await app.listen(PORT);
  console.log(`Nest test server listening on http://127.0.0.1:${PORT}/api/v1\n`);

  const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;

  const timestamp = Date.now();
  const testCustomerEmail = `customer_${timestamp}@yopmail.com`;
  const initialPassword = 'Password123!';

  let customerToken = '';
  let adminToken = '';
  let createdCategoryId = '';

  try {
    // -------------------------------------------------------------
    // 1. HEALTH CHECK
    // -------------------------------------------------------------
    console.log('\x1b[34m[Test Suite 1: Health Check]\x1b[0m');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    await assert('GET /health returns 200', healthRes.status === 200, 200, healthRes.status);
    await assert('GET /health status is ok', healthJson.status === 'ok', 'ok', healthJson.status);

    // -------------------------------------------------------------
    // 2. SETUP USER TOKENS (Customer & Admin)
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 2: Setup Tokens]\x1b[0m');

    // Customer
    const regCust = await (
      await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Alice Customer',
          email: testCustomerEmail,
          password: initialPassword,
          role: UserRole.CUSTOMER,
        }),
      })
    ).json();

    const verifyCust = await (
      await fetch(`${BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testCustomerEmail,
          otp: regCust.data?.otp,
        }),
      })
    ).json();
    customerToken = verifyCust.data?.accessToken;
    await assert('Customer token acquired', !!customerToken, true, !!customerToken);

    // Admin
    const adminLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@yopmail.com',
          password: 'admin1234',
        }),
      })
    ).json();
    adminToken = adminLogin.data?.accessToken;
    await assert('Admin token acquired', !!adminToken, true, !!adminToken);

    // -------------------------------------------------------------
    // 3. CATEGORIES API TESTS
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 3: Categories Security & Permissions]\x1b[0m');

    // A. Unauthorized creation (no token)
    const unauthCreate = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacker Plumbing' }),
    });
    await assert('POST /categories without token returns 401', unauthCreate.status === 401, 401, unauthCreate.status);

    // B. Forbidden creation (Customer token instead of Admin)
    const custCreate = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({ name: 'Customer Category' }),
    });
    await assert('POST /categories with Customer token returns 403 Forbidden', custCreate.status === 403, 403, custCreate.status);

    console.log('\n\x1b[34m[Test Suite 4: Categories CRUD by Admin]\x1b[0m');

    // C. Admin creates Plumbing Category
    const categoryName = `Plumbing_${timestamp}`;
    const createPlumbing = await (await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: categoryName,
        description: 'Complete plumbing, pipe repair, and drain cleaning services.',
        icon: 'https://cdn.example.com/icons/plumbing.svg',
        image: 'https://cdn.example.com/images/plumbing.jpg',
        skills: ['Pipe Leak Repair', 'Drain Cleaning', 'Tap Installation', 'Water Heater Setup'],
        order: 1,
        isPopular: true,
      }),
    })).json();

    await assert('POST /categories by Admin succeeds (201)', createPlumbing.statusCode === 201, 201, createPlumbing.statusCode);
    await assert('Category message is CATEGORY_ADDED', createPlumbing.message === Msg.CATEGORY_ADDED, Msg.CATEGORY_ADDED, createPlumbing.message);
    await assert('Category slug is auto-generated', !!createPlumbing.data?.slug, true, !!createPlumbing.data?.slug);
    await assert('Category skills count is 4', createPlumbing.data?.skills?.length === 4, 4, createPlumbing.data?.skills?.length);

    createdCategoryId = createPlumbing.data?._id;

    // D. Duplicate category creation check
    const duplicateCreate = await (await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: categoryName,
        description: 'Duplicate attempt',
      }),
    })).json();

    await assert('POST /categories rejects duplicate category (409)', duplicateCreate.statusCode === 409, 409, duplicateCreate.statusCode);
    await assert('Duplicate message is CATEGORY_EXISTS', duplicateCreate.message === Msg.CATEGORY_EXISTS, Msg.CATEGORY_EXISTS, duplicateCreate.message);

    // E. Public list of categories (for mobile apps / providers)
    const listRes = await (await fetch(`${BASE_URL}/categories`)).json();
    await assert('GET /categories succeeds publicly (200)', listRes.statusCode === 200, 200, listRes.statusCode);
    await assert('GET /categories returns category list array', Array.isArray(listRes.data), true, Array.isArray(listRes.data));
    await assert('Created category is in list', listRes.data.some((c: any) => c._id === createdCategoryId), true, true);

    // F. Search categories by keyword
    const searchRes = await (await fetch(`${BASE_URL}/categories?search=${categoryName}`)).json();
    await assert('GET /categories?search=... finds category', searchRes.data?.length >= 1, true, searchRes.data?.length);

    // G. Get category by ID
    const getByIdRes = await (await fetch(`${BASE_URL}/categories/${createdCategoryId}`)).json();
    await assert('GET /categories/:id returns single category (200)', getByIdRes.statusCode === 200, 200, getByIdRes.statusCode);
    await assert('Category name matches', getByIdRes.data?.name === categoryName, categoryName, getByIdRes.data?.name);

    // H. Update category as Admin
    const updateRes = await (await fetch(`${BASE_URL}/categories/${createdCategoryId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        description: 'Updated plumbing description with 24/7 emergency support.',
        order: 5,
      }),
    })).json();

    await assert('PATCH /categories/:id updates category (200)', updateRes.statusCode === 200, 200, updateRes.statusCode);
    await assert('Category message is CATEGORY_UPDATED', updateRes.message === Msg.CATEGORY_UPDATED, Msg.CATEGORY_UPDATED, updateRes.message);
    await assert('Updated description reflects', updateRes.data?.description?.includes('24/7 emergency'), true, updateRes.data?.description);

    // I. Delete category as Admin
    const deleteRes = await (await fetch(`${BASE_URL}/categories/${createdCategoryId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    })).json();

    await assert('DELETE /categories/:id deletes category (200)', deleteRes.statusCode === 200, 200, deleteRes.statusCode);
    await assert('Category message is CATEGORY_DELETED', deleteRes.message === Msg.CATEGORY_DELETED, Msg.CATEGORY_DELETED, deleteRes.message);

    // J. Verify category no longer found
    const verifyDeleted = await (await fetch(`${BASE_URL}/categories/${createdCategoryId}`)).json();
    await assert('GET /categories/:id on deleted category returns 404', verifyDeleted.statusCode === 404, 404, verifyDeleted.statusCode);

  } catch (err: any) {
    console.error('\n❌ Unhandled error during test execution:', err);
    results.push({ name: 'Execution Crash', passed: false, error: err?.message });
  } finally {
    await app.close();
  }

  // Summary
  console.log('\n=============================================');
  console.log('📊 TEST SUMMARY');
  console.log('=============================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log(`Total tests : ${total}`);
  console.log(`Passed      : \x1b[32m${passed}\x1b[0m`);
  console.log(`Failed      : ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '0'}`);

  if (failed > 0) {
    console.error('\n❌ SOME TESTS FAILED:');
    results.filter((r) => !r.passed).forEach((r) => console.error(`  - ${r.name}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

run();
