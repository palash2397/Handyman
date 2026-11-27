import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ValidationPipe } from '@nestjs/common';
import { UserRole, UserStatus, OtpType } from '../src/types/enums';
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
  const initialPassword = 'InitialPassword123!';
  const updatedPassword1 = 'UpdatedPassword456!';
  const updatedPassword2 = 'FinalPassword789!';
  let customerOtp = '';
  let passwordResetToken = '';

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
        password: initialPassword,
        role: UserRole.CUSTOMER,
      }),
    });
    const regJson = await regRes.json();
    await assert('POST /auth/register returns statusCode 201', regJson.statusCode === 201, 201, regJson.statusCode);
    await assert('POST /auth/register message is OTP_SENT', regJson.message === Msg.OTP_SENT, Msg.OTP_SENT, regJson.message);
    await assert('POST /auth/register returns OTP code', typeof regJson.data?.otp === 'string' && regJson.data.otp.length === 6, '6-digit otp', regJson.data?.otp);

    customerOtp = regJson.data?.otp || '';

    // -------------------------------------------------------------
    // 3. UNVERIFIED USER LOGIN BLOCK
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 3: Login Block Before Verification]\x1b[0m');
    const unverifiedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: initialPassword,
      }),
    });
    const unverifiedLoginJson = await unverifiedLoginRes.json();
    await assert('POST /auth/login blocks unverified user (403)', unverifiedLoginJson.statusCode === 403, 403, unverifiedLoginJson.statusCode);
    await assert('POST /auth/login blocked message is USER_NOT_VERIFIED', unverifiedLoginJson.message === Msg.USER_NOT_VERIFIED, Msg.USER_NOT_VERIFIED, unverifiedLoginJson.message);

    // -------------------------------------------------------------
    // 4. ACCOUNT VERIFICATION & RESEND OTP FLOW
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 4: Account OTP Verification & Resend]\x1b[0m');

    // Resend OTP for account verification
    const resendRes = await fetch(`${BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        type: OtpType.ACCOUNT_VERIFICATION,
      }),
    });
    const resendJson = await resendRes.json();
    await assert('POST /auth/resend-otp succeeds (200)', resendJson.statusCode === 200, 200, resendJson.statusCode);
    await assert('POST /auth/resend-otp message is OTP_RESENT', resendJson.message === Msg.OTP_RESENT, Msg.OTP_RESENT, resendJson.message);

    customerOtp = resendJson.data?.otp;

    // Verify valid OTP for account
    const validOtpRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        otp: customerOtp,
        type: OtpType.ACCOUNT_VERIFICATION,
      }),
    });
    const validOtpJson = await validOtpRes.json();
    await assert('POST /auth/verify-otp activates account (200)', validOtpJson.statusCode === 200, 200, validOtpJson.statusCode);
    await assert('POST /auth/verify-otp returns JWT accessToken', typeof validOtpJson.data?.accessToken === 'string', 'JWT string', typeof validOtpJson.data?.accessToken);
    await assert('POST /auth/verify-otp user isEmailVerified is true', validOtpJson.data?.user?.isEmailVerified === true, true, validOtpJson.data?.user?.isEmailVerified);

    // Verify already verified user returns error
    const reverifyRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        otp: customerOtp,
        type: OtpType.ACCOUNT_VERIFICATION,
      }),
    });
    const reverifyJson = await reverifyRes.json();
    await assert('POST /auth/verify-otp rejects re-verifying active user (400)', reverifyJson.statusCode === 400, 400, reverifyJson.statusCode);

    // -------------------------------------------------------------
    // 5. LOGIN AFTER VERIFICATION
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 5: Verified User Login]\x1b[0m');
    const verifiedLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: initialPassword,
      }),
    });
    const verifiedLoginJson = await verifiedLoginRes.json();
    await assert('POST /auth/login succeeds for verified customer (200)', verifiedLoginJson.statusCode === 200, 200, verifiedLoginJson.statusCode);
    await assert('POST /auth/login returns accessToken', typeof verifiedLoginJson.data?.accessToken === 'string', 'JWT string', typeof verifiedLoginJson.data?.accessToken);

    // -------------------------------------------------------------
    // 6. FORGOT PASSWORD & PASSWORD VERIFICATION OTP FLOW
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 6: Forgot Password & Shared OTP Verification]\x1b[0m');

    // Forgot password request
    const forgotRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
      }),
    });
    const forgotJson = await forgotRes.json();
    await assert('POST /auth/forgot-password returns 200', forgotJson.statusCode === 200, 200, forgotJson.statusCode);
    await assert('POST /auth/forgot-password message is OTP_SENT', forgotJson.message === Msg.OTP_SENT, Msg.OTP_SENT, forgotJson.message);
    await assert('POST /auth/forgot-password returns OTP', typeof forgotJson.data?.otp === 'string', '6-digit otp', forgotJson.data?.otp);

    let forgotOtp = forgotJson.data?.otp;

    // Resend OTP for forgot password using shared resendOtp endpoint
    const resendForgotRes = await fetch(`${BASE_URL}/auth/resend-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        type: OtpType.FORGOT_PASSWORD,
      }),
    });
    const resendForgotJson = await resendForgotRes.json();
    await assert('POST /auth/resend-otp succeeds for FORGOT_PASSWORD (200)', resendForgotJson.statusCode === 200, 200, resendForgotJson.statusCode);
    await assert('POST /auth/resend-otp message is OTP_RESENT', resendForgotJson.message === Msg.OTP_RESENT, Msg.OTP_RESENT, resendForgotJson.message);

    forgotOtp = resendForgotJson.data?.otp;

    // Verify OTP for password reset using shared verifyOtp endpoint
    const verifyForgotRes = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        otp: forgotOtp,
        type: OtpType.FORGOT_PASSWORD,
      }),
    });
    const verifyForgotJson = await verifyForgotRes.json();
    await assert('POST /auth/verify-otp verifies FORGOT_PASSWORD OTP (200)', verifyForgotJson.statusCode === 200, 200, verifyForgotJson.statusCode);
    await assert('POST /auth/verify-otp returns resetToken for password change', typeof verifyForgotJson.data?.resetToken === 'string', 'resetToken string', typeof verifyForgotJson.data?.resetToken);

    passwordResetToken = verifyForgotJson.data?.resetToken;

    // -------------------------------------------------------------
    // 7. CHANGE PASSWORD FLOW (VIA RESET TOKEN)
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 7: Change Password via Reset Token]\x1b[0m');

    // Attempt setting the same password
    const samePassRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToken: passwordResetToken,
        newPassword: initialPassword,
      }),
    });
    const samePassJson = await samePassRes.json();
    await assert('POST /auth/change-password rejects old password reuse (400)', samePassJson.statusCode === 400, 400, samePassJson.statusCode);
    await assert('POST /auth/change-password message is ENTERED_OLD_PASSWORD', samePassJson.message === Msg.ENTERED_OLD_PASSWORD, Msg.ENTERED_OLD_PASSWORD, samePassJson.message);

    // Change to updatedPassword1 successfully
    const changePassRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        resetToken: passwordResetToken,
        newPassword: updatedPassword1,
      }),
    });
    const changePassJson = await changePassRes.json();
    await assert('POST /auth/change-password succeeds with resetToken (200)', changePassJson.statusCode === 200, 200, changePassJson.statusCode);
    await assert('POST /auth/change-password message is PASSWORD_CHANGED', changePassJson.message === Msg.PASSWORD_CHANGED, Msg.PASSWORD_CHANGED, changePassJson.message);

    // Verify login with OLD password fails
    const oldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: initialPassword,
      }),
    });
    const oldLoginJson = await oldLoginRes.json();
    await assert('POST /auth/login fails with old password (401)', oldLoginJson.statusCode === 401, 401, oldLoginJson.statusCode);

    // Verify login with NEW password succeeds
    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: updatedPassword1,
      }),
    });
    const newLoginJson = await newLoginRes.json();
    await assert('POST /auth/login succeeds with updated password (200)', newLoginJson.statusCode === 200, 200, newLoginJson.statusCode);

    // -------------------------------------------------------------
    // 8. CHANGE PASSWORD FLOW (VIA OLD PASSWORD / SETTINGS)
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 8: Change Password via Old Password]\x1b[0m');

    // Wrong old password
    const wrongOldRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        oldPassword: 'WrongOldPassword123!',
        newPassword: updatedPassword2,
      }),
    });
    const wrongOldJson = await wrongOldRes.json();
    await assert('POST /auth/change-password rejects wrong oldPassword (400)', wrongOldJson.statusCode === 400, 400, wrongOldJson.statusCode);
    await assert('POST /auth/change-password message is PASSWORD_OLD_INCORRECT', wrongOldJson.message === Msg.PASSWORD_OLD_INCORRECT, Msg.PASSWORD_OLD_INCORRECT, wrongOldJson.message);

    // Correct old password -> updates to updatedPassword2
    const correctOldRes = await fetch(`${BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        oldPassword: updatedPassword1,
        newPassword: updatedPassword2,
      }),
    });
    const correctOldJson = await correctOldRes.json();
    await assert('POST /auth/change-password succeeds with oldPassword (200)', correctOldJson.statusCode === 200, 200, correctOldJson.statusCode);
    await assert('POST /auth/change-password message is PASSWORD_CHANGED', correctOldJson.message === Msg.PASSWORD_CHANGED, Msg.PASSWORD_CHANGED, correctOldJson.message);

    // -------------------------------------------------------------
    // 9. SEEDED ADMIN LOGIN
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 9: Seeded Admin Login]\x1b[0m');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@yopmail.com',
        password: 'admin1234',
      }),
    });
    const adminLoginJson = await adminLoginRes.json();
    await assert('POST /auth/login seeded Admin login succeeds (200)', adminLoginJson.statusCode === 200, 200, adminLoginJson.statusCode);
    await assert('POST /auth/login Admin role is ADMIN', adminLoginJson.data?.user?.role === UserRole.ADMIN, UserRole.ADMIN, adminLoginJson.data?.user?.role);

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
