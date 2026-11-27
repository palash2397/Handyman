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

  const timestamp = Date.now();
  const testCustomerEmail = `customer_${timestamp}@yopmail.com`;
  const testProviderEmail = `provider_${timestamp}@yopmail.com`;
  const testCompanyEmail = `company_${timestamp}@yopmail.com`;
  const initialPassword = 'Password123!';

  let customerToken = '';
  let providerToken = '';
  let companyToken = '';
  let adminToken = '';

  try {
    // -------------------------------------------------------------
    // 1. HEALTH CHECK
    // -------------------------------------------------------------
    console.log('\x1b[34m[Test Suite 1: Health Check]\x1b[0m');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    await assert(
      'GET /health returns 200',
      healthRes.status === 200,
      200,
      healthRes.status,
    );
    await assert(
      'GET /health status is ok',
      healthJson.status === 'ok',
      'ok',
      healthJson.status,
    );

    // -------------------------------------------------------------
    // 2. SETUP USERS & ACQUIRE TOKENS FOR ALL ROLES
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 2: Setup Users & Tokens for All Roles]\x1b[0m');

    // Customer
    const regCust = await (await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alice Customer',
        email: testCustomerEmail,
        password: initialPassword,
        role: UserRole.CUSTOMER,
      }),
    })).json();

    const verifyCust = await (await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        otp: regCust.data?.otp,
      }),
    })).json();
    customerToken = verifyCust.data?.accessToken;
    await assert('Customer registered, verified, and JWT token acquired', !!customerToken, true, !!customerToken);

    // Provider
    const regProv = await (await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bob Handyman',
        email: testProviderEmail,
        password: initialPassword,
        role: UserRole.PROVIDER,
      }),
    })).json();

    const verifyProv = await (await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testProviderEmail,
        otp: regProv.data?.otp,
      }),
    })).json();
    providerToken = verifyProv.data?.accessToken;
    await assert('Provider registered, verified, and JWT token acquired', !!providerToken, true, !!providerToken);

    // Company
    const regComp = await (await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Charlie CEO',
        email: testCompanyEmail,
        password: initialPassword,
        role: UserRole.COMPANY,
        companyName: 'Charlie Tech Solutions Ltd',
        authorizedPersonName: 'Charlie CEO',
      }),
    })).json();

    const verifyComp = await (await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCompanyEmail,
        otp: regComp.data?.otp,
      }),
    })).json();
    companyToken = verifyComp.data?.accessToken;
    await assert('Company registered, verified, and JWT token acquired', !!companyToken, true, !!companyToken);

    // Admin
    const adminLogin = await (await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@yopmail.com',
        password: 'admin1234',
      }),
    })).json();
    adminToken = adminLogin.data?.accessToken;
    await assert('Admin logged in and JWT token acquired', !!adminToken, true, !!adminToken);

    // -------------------------------------------------------------
    // 3. UNAUTHORIZED ACCESS CHECK ON /auth/me
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 3: Unauthorized Access via JwtAuthGuard]\x1b[0m');
    const unauthRes = await fetch(`${BASE_URL}/auth/me`);
    const unauthJson = await unauthRes.json();
    await assert('GET /auth/me without token returns 401', unauthRes.status === 401, 401, unauthRes.status);
    await assert('401 response contains No token provided', JSON.stringify(unauthJson).includes('No token provided'), true, unauthJson);

    // -------------------------------------------------------------
    // 4. CUSTOMER PROFILE (GET & PATCH /auth/me)
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 4: Customer Profile in Auth Module]\x1b[0m');
    const custProfileRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const custProfileJson = await custProfileRes.json();
    await assert('GET /auth/me for Customer returns 200', custProfileJson.statusCode === 200, 200, custProfileJson.statusCode);
    await assert('Customer role is CUSTOMER', custProfileJson.data?.role === UserRole.CUSTOMER, UserRole.CUSTOMER, custProfileJson.data?.role);
    await assert('Customer status is ACTIVE', custProfileJson.data?.status === UserStatus.ACTIVE, UserStatus.ACTIVE, custProfileJson.data?.status);
    await assert('Customer password is NOT exposed', custProfileJson.data?.password === undefined, undefined, custProfileJson.data?.password);

    // Update Customer Profile
    const updateCustRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${customerToken}`,
      },
      body: JSON.stringify({
        name: 'Alice Updated',
        bio: 'Customer looking for verified home repairs',
        address: {
          street: '100 Broadway',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
        },
      }),
    });
    const updateCustJson = await updateCustRes.json();
    await assert('PATCH /auth/me updates Customer profile', updateCustJson.statusCode === 200, 200, updateCustJson.statusCode);
    await assert('Customer updated name reflects in response', updateCustJson.data?.name === 'Alice Updated', 'Alice Updated', updateCustJson.data?.name);
    await assert('Customer updated address reflects in response', updateCustJson.data?.address?.city === 'New York', 'New York', updateCustJson.data?.address?.city);

    // -------------------------------------------------------------
    // 5. PROVIDER PROFILE (GET & PATCH /auth/me)
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 5: Provider Profile in Auth Module]\x1b[0m');
    const provProfileRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${providerToken}` },
    });
    const provProfileJson = await provProfileRes.json();
    await assert('GET /auth/me for Provider returns 200', provProfileJson.statusCode === 200, 200, provProfileJson.statusCode);
    await assert('Provider role is PROVIDER', provProfileJson.data?.role === UserRole.PROVIDER, UserRole.PROVIDER, provProfileJson.data?.role);
    await assert('Provider status is PENDING', provProfileJson.data?.status === UserStatus.PENDING, UserStatus.PENDING, provProfileJson.data?.status);
    await assert('Provider onboardingStep is initialized to 1', provProfileJson.data?.onboardingStep === 1, 1, provProfileJson.data?.onboardingStep);

    // Update Provider Profile
    const updateProvRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      body: JSON.stringify({
        bio: 'Master technician with 7 years of electrical & plumbing experience.',
        experienceYears: 7,
        languages: ['English', 'Spanish'],
        address: {
          street: '456 Oak Avenue',
          city: 'Brooklyn',
          state: 'NY',
          postalCode: '11201',
          latitude: 40.6782,
          longitude: -73.9442,
        },
      }),
    });
    const updateProvJson = await updateProvRes.json();
    await assert('PATCH /auth/me updates Provider details', updateProvJson.statusCode === 200, 200, updateProvJson.statusCode);
    await assert('Provider updated experienceYears is 7', updateProvJson.data?.experienceYears === 7, 7, updateProvJson.data?.experienceYears);
    await assert('Provider updated languages count is 2', updateProvJson.data?.languages?.length === 2, 2, updateProvJson.data?.languages?.length);

    // -------------------------------------------------------------
    // 6. COMPANY PROFILE (GET & PATCH /auth/me)
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 6: Company Profile in Auth Module]\x1b[0m');
    const compProfileRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${companyToken}` },
    });
    const compProfileJson = await compProfileRes.json();
    await assert('GET /auth/me for Company returns 200', compProfileJson.statusCode === 200, 200, compProfileJson.statusCode);
    await assert('Company role is COMPANY', compProfileJson.data?.role === UserRole.COMPANY, UserRole.COMPANY, compProfileJson.data?.role);
    await assert('Company companyName is Charlie Tech Solutions Ltd', compProfileJson.data?.companyName === 'Charlie Tech Solutions Ltd', 'Charlie Tech Solutions Ltd', compProfileJson.data?.companyName);
    await assert('Company authorizedPersonName matches', compProfileJson.data?.authorizedPersonName === 'Charlie CEO', 'Charlie CEO', compProfileJson.data?.authorizedPersonName);

    // Update Company Profile
    const updateCompRes = await fetch(`${BASE_URL}/auth/me`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${companyToken}`,
      },
      body: JSON.stringify({
        bio: 'Enterprise maintenance and electrical solutions contractor.',
        address: {
          street: '789 Commercial Blvd',
          city: 'Manhattan',
          state: 'NY',
          postalCode: '10018',
        },
      }),
    });
    const updateCompJson = await updateCompRes.json();
    await assert('PATCH /auth/me updates Company profile', updateCompJson.statusCode === 200, 200, updateCompJson.statusCode);
    await assert('Company bio updated successfully', updateCompJson.data?.bio?.includes('Enterprise maintenance'), true, updateCompJson.data?.bio);

    // -------------------------------------------------------------
    // 7. ADMIN PROFILE (GET /auth/me)
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 7: Admin Profile in Auth Module]\x1b[0m');
    const adminProfileRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminProfileJson = await adminProfileRes.json();
    await assert('GET /auth/me for Admin returns 200', adminProfileJson.statusCode === 200, 200, adminProfileJson.statusCode);
    await assert('Admin role is ADMIN', adminProfileJson.data?.role === UserRole.ADMIN, UserRole.ADMIN, adminProfileJson.data?.role);
    await assert('Admin email is admin@yopmail.com', adminProfileJson.data?.email === 'admin@yopmail.com', 'admin@yopmail.com', adminProfileJson.data?.email);

    // -------------------------------------------------------------
    // 8. ALIAS ROUTE: GET /auth/profile
    // -------------------------------------------------------------
    console.log('\n\x1b[34m[Test Suite 8: Alias GET /auth/profile]\x1b[0m');
    const aliasRes = await fetch(`${BASE_URL}/auth/profile`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const aliasJson = await aliasRes.json();
    await assert('GET /auth/profile returns 200', aliasJson.statusCode === 200, 200, aliasJson.statusCode);
    await assert('GET /auth/profile returns authenticated email', aliasJson.data?.email === testCustomerEmail.toLowerCase(), testCustomerEmail.toLowerCase(), aliasJson.data?.email);

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
