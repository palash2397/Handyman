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
  const testCustomerPhone = `+19${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'Password123!';
  let customerOtp = '';

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
    // 2. REGISTRATION FLOW
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 2: Registration Flow]\x1b[0m');
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Customer',
        email: testCustomerEmail,
        phone: testCustomerPhone,
        password: testPassword,
        role: UserRole.CUSTOMER,
      }),
    });
    const regJson = await regRes.json();
    await assert('POST /auth/register returns statusCode 201', regJson.statusCode === 201, 201, regJson.statusCode);
    await assert('POST /auth/register message is OTP_SENT', regJson.message === Msg.OTP_SENT, Msg.OTP_SENT, regJson.message);
    await assert('POST /auth/register status is ACTIVE for customer', regJson.data?.status === UserStatus.ACTIVE, UserStatus.ACTIVE, regJson.data?.status);
    await assert('POST /auth/register returns OTP code', typeof regJson.data?.otp === 'string' && regJson.data.otp.length === 6, '6-digit otp', regJson.data?.otp);

    customerOtp = regJson.data?.otp || '';

    // Test duplicate email
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Customer',
        email: testCustomerEmail,
        password: testPassword,
        role: UserRole.CUSTOMER,
      }),
    });
    const dupJson = await dupRes.json();
    await assert('POST /auth/register rejects duplicate email (409)', dupJson.statusCode === 409, 409, dupJson.statusCode);
    await assert('POST /auth/register duplicate message is USER_EXISTS', dupJson.message === Msg.USER_EXISTS, Msg.USER_EXISTS, dupJson.message);

    // Test public admin registration block via DTO validation
    const adminRegRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: `fakeadmin_${timestamp}@yopmail.com`,
        password: testPassword,
        role: UserRole.ADMIN,
      }),
    });
    const adminRegJson = await adminRegRes.json();
    await assert('POST /auth/register blocks ADMIN registration via ValidationPipe (400)', adminRegRes.status === 400, 400, adminRegRes.status);
    await assert('POST /auth/register error details role restriction', JSON.stringify(adminRegJson.message).includes('Role must be CUSTOMER, PROVIDER, or COMPANY'), true, adminRegJson.message);

    // Test company registration
    const compRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'FixIt Solutions',
        email: `company_${timestamp}@yopmail.com`,
        password: testPassword,
        role: UserRole.COMPANY,
        companyName: 'FixIt Solutions Pvt Ltd',
        authorizedPersonName: 'Sarah CEO',
      }),
    });
    const compJson = await compRes.json();
    await assert('POST /auth/register registers COMPANY (201)', compJson.statusCode === 201, 201, compJson.statusCode);
    await assert('POST /auth/register company status is PENDING', compJson.data?.status === UserStatus.PENDING, UserStatus.PENDING, compJson.data?.status);

    // -------------------------------------------------------------
    // 3. OTP VERIFICATION & RESEND FLOW
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 3: OTP Verification & Resend Flow]\x1b[0m');

    // Invalid OTP
    const invalidOtpRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        otp: '000000',
      }),
    });
    const invalidOtpJson = await invalidOtpRes.json();
    await assert('POST /auth/verify-otp rejects invalid OTP (400)', invalidOtpJson.statusCode === 400, 400, invalidOtpJson.statusCode);
    await assert('POST /auth/verify-otp message is OTP_INVALID', invalidOtpJson.message === Msg.OTP_INVALID, Msg.OTP_INVALID, invalidOtpJson.message);

    // Resend OTP
    const resendRes = await fetch(`${BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
      }),
    });
    const resendJson = await resendRes.json();
    await assert('POST /auth/resend-otp succeeds (200)', resendJson.statusCode === 200, 200, resendJson.statusCode);
    await assert('POST /auth/resend-otp message is OTP_RESENT', resendJson.message === Msg.OTP_RESENT, Msg.OTP_RESENT, resendJson.message);
    await assert('POST /auth/resend-otp returns new OTP', typeof resendJson.data?.otp === 'string' && resendJson.data.otp.length === 6, '6-digit otp', resendJson.data?.otp);

    customerOtp = resendJson.data?.otp;

    // Verify valid OTP
    const validOtpRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        otp: customerOtp,
      }),
    });
    const validOtpJson = await validOtpRes.json();
    await assert('POST /auth/verify-otp succeeds with valid OTP (200)', validOtpJson.statusCode === 200, 200, validOtpJson.statusCode);
    await assert('POST /auth/verify-otp message is OTP_VERIFIED', validOtpJson.message === Msg.OTP_VERIFIED, Msg.OTP_VERIFIED, validOtpJson.message);
    await assert('POST /auth/verify-otp returns JWT accessToken', typeof validOtpJson.data?.accessToken === 'string', 'JWT string', typeof validOtpJson.data?.accessToken);
    await assert('POST /auth/verify-otp marks isEmailVerified true', validOtpJson.data?.user?.isEmailVerified === true, true, validOtpJson.data?.user?.isEmailVerified);

    // Re-verify already verified user
    const reverifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        otp: customerOtp,
      }),
    });
    const reverifyJson = await reverifyRes.json();
    await assert('POST /auth/verify-otp rejects already verified user (400)', reverifyJson.statusCode === 400, 400, reverifyJson.statusCode);
    await assert('POST /auth/verify-otp message is USER_ALREADY_VERIFIED', reverifyJson.message === Msg.USER_ALREADY_VERIFIED, Msg.USER_ALREADY_VERIFIED, reverifyJson.message);

    // -------------------------------------------------------------
    // 4. LOGIN FLOW
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 4: Login Flow]\x1b[0m');

    // Wrong password
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: 'incorrectPassword123',
      }),
    });
    const wrongPassJson = await wrongPassRes.json();
    await assert('POST /auth/login fails on wrong password (401)', wrongPassJson.statusCode === 401, 401, wrongPassJson.statusCode);
    await assert('POST /auth/login message is INVALID_CREDENTIALS', wrongPassJson.message === Msg.INVALID_CREDENTIALS, Msg.INVALID_CREDENTIALS, wrongPassJson.message);

    // Customer successful login
    const customerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testPassword,
      }),
    });
    const customerLoginJson = await customerLoginRes.json();
    await assert('POST /auth/login customer login succeeds (200)', customerLoginJson.statusCode === 200, 200, customerLoginJson.statusCode);
    await assert('POST /auth/login returns JWT accessToken', typeof customerLoginJson.data?.accessToken === 'string', 'JWT string', typeof customerLoginJson.data?.accessToken);
    await assert('POST /auth/login returns customer profile', customerLoginJson.data?.user?.email === testCustomerEmail.toLowerCase(), testCustomerEmail.toLowerCase(), customerLoginJson.data?.user?.email);

    // Seeded Admin login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@yopmail.com',
        password: 'admin1234',
      }),
    });
    const adminLoginJson = await adminLoginRes.json();
    await assert('POST /auth/login seeded Admin login succeeds (200)', adminLoginRes.status === 200 && adminLoginJson.statusCode === 200, 200, adminLoginJson.statusCode);
    await assert('POST /auth/login Admin has role ADMIN', adminLoginJson.data?.user?.role === UserRole.ADMIN, UserRole.ADMIN, adminLoginJson.data?.user?.role);
    await assert('POST /auth/login Admin returns JWT accessToken', typeof adminLoginJson.data?.accessToken === 'string', 'JWT string', typeof adminLoginJson.data?.accessToken);

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
