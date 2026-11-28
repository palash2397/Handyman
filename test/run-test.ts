import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { UserRole } from '../src/types/enums';

interface TestResult {
  name: string;
  passed: boolean;
  expected?: any;
  actual?: any;
  error?: string;
}

const results: TestResult[] = [];

async function assert(
  name: string,
  condition: boolean,
  expected?: any,
  actual?: any,
) {
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

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

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
  console.log(
    `Nest test server listening on http://127.0.0.1:${PORT}/api/v1\n`,
  );

  const BASE_URL = `http://127.0.0.1:${PORT}/api/v1`;
  const envBaseUrl = (process.env.BASE_URL || 'http://localhost:4022').replace(
    /\/+$/,
    '',
  );

  let adminToken = '';

  try {
    // -------------------------------------------------------------
    // 1. ADMIN TOKEN ACQUISITION
    // -------------------------------------------------------------
    console.log('\x1b[34m[Test Suite 1: Admin Authentication]\x1b[0m');
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
    await assert(
      'Seeded Admin token acquired',
      !!adminToken,
      true,
      !!adminToken,
    );

    // -------------------------------------------------------------
    // 2. SEEDED CATEGORIES WITH DYNAMIC IMAGE URLs
    // -------------------------------------------------------------
    console.log(
      '\n\x1b[34m[Test Suite 2: Seeded Categories & Dynamic Image URLs]\x1b[0m',
    );
    const categoriesRes = await (await fetch(`${BASE_URL}/categories`)).json();
    await assert(
      'GET /categories returns 200',
      categoriesRes.statusCode === 200,
      200,
      categoriesRes.statusCode,
    );
    await assert(
      'At least 9 categories exist',
      categoriesRes.data?.length >= 9,
      true,
      categoriesRes.data?.length,
    );

    // Verify Plumbing category specifically
    const plumbing = categoriesRes.data?.find(
      (c: any) => c.name === 'Plumbing',
    );
    await assert('Plumbing category is seeded', !!plumbing, true, !!plumbing);
    await assert(
      'Plumbing imageName is Plumbing.png (saved filename in DB)',
      plumbing?.imageName === 'Plumbing.png',
      'Plumbing.png',
      plumbing?.imageName,
    );
    await assert(
      'Plumbing image URL contains dynamic BASE_URL from .env',
      plumbing?.image?.startsWith(envBaseUrl) &&
        plumbing?.image?.includes('/uploads/categories/Plumbing.png'),
      true,
      plumbing?.image,
    );
    await assert(
      'Plumbing icon URL contains dynamic BASE_URL from .env',
      plumbing?.icon?.startsWith(envBaseUrl) &&
        plumbing?.icon?.includes('/uploads/categories/Plumbing.png'),
      true,
      plumbing?.icon,
    );

    // Verify Electrical category
    const electrical = categoriesRes.data?.find(
      (c: any) => c.name === 'Electrical',
    );
    await assert(
      'Electrical category is seeded',
      !!electrical,
      true,
      !!electrical,
    );
    await assert(
      'Electrical imageName is Electrical.png',
      electrical?.imageName === 'Electrical.png',
      'Electrical.png',
      electrical?.imageName,
    );
    await assert(
      'Electrical image has full dynamic URL',
      electrical?.image?.includes('/uploads/categories/Electrical.png'),
      true,
      electrical?.image,
    );

    // Verify Cleaning category
    const cleaning = categoriesRes.data?.find(
      (c: any) => c.name === 'Cleaning',
    );
    await assert('Cleaning category is seeded', !!cleaning, true, !!cleaning);
    await assert(
      'Cleaning has skills array',
      cleaning?.skills?.length >= 4,
      true,
      cleaning?.skills?.length,
    );

    // Verify HVAC category
    const hvac = categoriesRes.data?.find((c: any) => c.name === 'HVAC');
    await assert('HVAC category is seeded', !!hvac, true, !!hvac);

    // Verify Carpentry category
    const carpentry = categoriesRes.data?.find(
      (c: any) => c.name === 'Carpentry',
    );
    await assert(
      'Carpentry category is seeded',
      !!carpentry,
      true,
      !!carpentry,
    );

    // Verify Painting category
    const painting = categoriesRes.data?.find(
      (c: any) => c.name === 'Painting',
    );
    await assert('Painting category is seeded', !!painting, true, !!painting);

    // Verify Gardening category
    const gardening = categoriesRes.data?.find(
      (c: any) => c.name === 'Gardening',
    );
    await assert(
      'Gardening category is seeded',
      !!gardening,
      true,
      !!gardening,
    );

    // Verify Home Service category
    const homeService = categoriesRes.data?.find(
      (c: any) => c.name === 'Home Service',
    );
    await assert(
      'Home Service category is seeded',
      !!homeService,
      true,
      !!homeService,
    );

    // -------------------------------------------------------------
    // 3. ADMIN CREATES NEW CATEGORY VIA FILENAME
    // -------------------------------------------------------------
    console.log(
      '\n\x1b[34m[Test Suite 3: Admin Creates Category with Raw Filename]\x1b[0m',
    );
    const timestamp = Date.now();
    const newCategoryName = `Smart Home_${timestamp}`;
    const newCategoryRes = await (
      await fetch(`${BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: newCategoryName,
          description:
            'Smart doorbell, CCTV security, and IoT home automation.',
          image: 'Home Service.png',
          icon: 'Home Service.png',
          skills: [
            'CCTV Camera Setup',
            'Smart Lock Fitting',
            'Video Doorbell Setup',
          ],
          order: 10,
          isPopular: true,
        }),
      })
    ).json();

    await assert(
      'Admin creates new category (201)',
      newCategoryRes.statusCode === 201,
      201,
      newCategoryRes.statusCode,
    );
    await assert(
      'DB stores raw filename imageName',
      newCategoryRes.data?.imageName === 'Home Service.png',
      'Home Service.png',
      newCategoryRes.data?.imageName,
    );
    await assert(
      'API returns dynamic full URL for image',
      newCategoryRes.data?.image?.startsWith(envBaseUrl),
      true,
      newCategoryRes.data?.image,
    );

    const createdId = newCategoryRes.data?._id;

    // -------------------------------------------------------------
    // 4. GET BY ID & CLEANUP
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 4: Get By ID & Cleanup]\x1b[0m');
    const getByIdRes = await (
      await fetch(`${BASE_URL}/categories/${createdId}`)
    ).json();
    await assert(
      'GET /categories/:id returns 200',
      getByIdRes.statusCode === 200,
      200,
      getByIdRes.statusCode,
    );
    await assert(
      'Category image contains dynamic URL',
      getByIdRes.data?.image?.startsWith(envBaseUrl),
      true,
      getByIdRes.data?.image,
    );

    // Clean up created test category
    await fetch(`${BASE_URL}/categories/${createdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    // -------------------------------------------------------------
    // 5. ADMIN CREATES CATEGORY VIA MULTIPART/FORM-DATA (FILE UPLOAD)
    // -------------------------------------------------------------
    console.log(
      '\n\x1b[34m[Test Suite 5: Admin Creates Category via Multipart File Upload]\x1b[0m',
    );
    const uploadTimestamp = Date.now();
    const uploadCategoryName = `Painting Service_${uploadTimestamp}`;
    const form = new FormData();
    form.append('name', uploadCategoryName);
    form.append('description', 'Wall painting and surface polishing');
    form.append('order', '5');
    form.append('isPopular', 'true');
    form.append('skills', 'Interior Painting, Exterior Painting, Wallpaper');

    // Create a real file blob to simulate file upload from Swagger UI
    const fileBytes = Buffer.from('89504e470d0a1a0a', 'hex'); // PNG magic bytes
    const fileBlob = new Blob([fileBytes], { type: 'image/png' });
    form.append('image', fileBlob, 'uploaded-wall.png');

    const multipartRes = await (
      await fetch(`${BASE_URL}/categories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        body: form,
      })
    ).json();

    await assert(
      'Admin uploads category with binary file (201)',
      multipartRes.statusCode === 201,
      201,
      multipartRes.statusCode,
    );
    await assert(
      'Uploaded image filename ends with .png',
      multipartRes.data?.imageName?.endsWith('.png'),
      true,
      multipartRes.data?.imageName,
    );
    await assert(
      'Uploaded image has full dynamic BASE_URL',
      multipartRes.data?.image?.startsWith(envBaseUrl),
      true,
      multipartRes.data?.image,
    );
    await assert(
      'Skills parsed as array from comma-separated string',
      Array.isArray(multipartRes.data?.skills) &&
        multipartRes.data?.skills?.length === 3,
      true,
      multipartRes.data?.skills,
    );
    await assert(
      'Order converted to number',
      typeof multipartRes.data?.order === 'number',
      true,
      typeof multipartRes.data?.order,
    );
    await assert(
      'isPopular converted to boolean',
      multipartRes.data?.isPopular === true,
      true,
      multipartRes.data?.isPopular,
    );

    const uploadCreatedId = multipartRes.data?._id;
    if (uploadCreatedId) {
      // Clean up multipart category
      await fetch(`${BASE_URL}/categories/${uploadCreatedId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }
    // -------------------------------------------------------------
    // 6. FLAG-BASED FORGOT PASSWORD, VERIFY OTP, RESET & CHANGE PASSWORD
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 6: Flag-Based Forgot Password, Reset & Change Password]\x1b[0m');
    const testUserEmail = `customer_flag_${Date.now()}@yopmail.com`;
    const initialPass = 'initialPass123';

    // Register test customer
    const regRes = await (await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Flag Test User',
        email: testUserEmail,
        password: initialPass,
        phone: `9876${Date.now().toString().slice(-6)}`,
        role: UserRole.CUSTOMER,
      }),
    })).json();

    await assert('Test customer registered (201)', regRes.statusCode === 201 || regRes.statusCode === 200, 201, regRes.statusCode);

    // Verify account OTP so user is verified
    const regOtp = regRes.data?.otp;
    const verifyRegRes = await (await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        otp: regOtp,
        type: 'ACCOUNT_VERIFICATION',
      }),
    })).json();
    await assert('Test customer account verified', verifyRegRes.statusCode === 200, 200, verifyRegRes.statusCode);

    // Attempt Reset Password BEFORE OTP verification -> MUST FAIL
    const unverifiedResetRes = await (await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        newPassword: 'newPassword123',
        confirmPassword: 'newPassword123',
      }),
    })).json();
    await assert('Reset-password rejected before OTP verification (400)', unverifiedResetRes.statusCode === 400, 400, unverifiedResetRes.statusCode);

    // Request Forgot Password OTP
    const forgotRes = await (await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUserEmail }),
    })).json();
    await assert('Forgot password OTP requested (200)', forgotRes.statusCode === 200, 200, forgotRes.statusCode);
    const forgotOtp = forgotRes.data?.otp;
    await assert('OTP generated for forgot password', !!forgotOtp, true, !!forgotOtp);

    // Verify OTP with type FORGOT_PASSWORD -> Sets isForgotPassword flag, NO resetToken
    const verifyForgotRes = await (await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        otp: forgotOtp,
        type: 'FORGOT_PASSWORD',
      }),
    })).json();
    await assert('Verify OTP for forgot password succeeds (200)', verifyForgotRes.statusCode === 200, 200, verifyForgotRes.statusCode);
    await assert('No resetToken returned in verify-otp', verifyForgotRes.data?.resetToken === undefined, true, verifyForgotRes.data?.resetToken === undefined);

    // Reset Password with clean payload (only email, newPassword, confirmPassword)
    const resetRes = await (await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        newPassword: 'resetPassword123',
        confirmPassword: 'resetPassword123',
      }),
    })).json();
    await assert('Password reset successfully (200)', resetRes.statusCode === 200, 200, resetRes.statusCode);

    // Login with new password
    const loginNewRes = await (await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: 'resetPassword123',
      }),
    })).json();
    await assert('Login with reset password succeeds (200)', loginNewRes.statusCode === 200, 200, loginNewRes.statusCode);

    // Replay attack prevention: Try to call reset-password again -> MUST FAIL
    const replayResetRes = await (await fetch(`${BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        newPassword: 'anotherPassword123',
        confirmPassword: 'anotherPassword123',
      }),
    })).json();
    await assert('Reset-password cannot be reused (400)', replayResetRes.statusCode === 400, 400, replayResetRes.statusCode);

    // Change Password flow (requires email, oldPassword, newPassword, confirmPassword)
    const changePassRes = await (await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        oldPassword: 'resetPassword123',
        newPassword: 'finalPassword456',
        confirmPassword: 'finalPassword456',
      }),
    })).json();
    await assert('Change-password with correct old password succeeds (200)', changePassRes.statusCode === 200, 200, changePassRes.statusCode);

    // Verify login with final password
    const loginFinalRes = await (await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        password: 'finalPassword456',
      }),
    })).json();
    await assert('Login with changed password succeeds (200)', loginFinalRes.statusCode === 200, 200, loginFinalRes.statusCode);

    // Change Password with incorrect old password -> MUST FAIL
    const wrongChangePassRes = await (await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testUserEmail,
        oldPassword: 'wrongOldPassword',
        newPassword: 'attemptPassword789',
        confirmPassword: 'attemptPassword789',
      }),
    })).json();
    await assert('Change-password rejects incorrect old password (400)', wrongChangePassRes.statusCode === 400, 400, wrongChangePassRes.statusCode);

  } catch (err: any) {
    console.error('\n❌ Unhandled error during test execution:', err);
    results.push({
      name: 'Execution Crash',
      passed: false,
      error: err?.message,
    });
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
    results
      .filter((r) => !r.passed)
      .forEach((r) => console.error(`  - ${r.name}`));
    process.exit(1);
  } else {
    console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  }
}

run();
