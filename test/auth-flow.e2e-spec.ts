import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole, UserStatus } from '../src/types/enums';
import { Msg } from '../src/helpers/responseMsg';

describe('Auth & Health Flow (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('/api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  const timestamp = Date.now();
  const testCustomerEmail = `testcustomer_${timestamp}@yopmail.com`;
  const testCustomerPhone = `+1999${Math.floor(100000 + Math.random() * 900000)}`;
  const testPassword = 'Password123!';
  let customerOtp: string;

  describe('1. Health Check', () => {
    it('GET /api/v1/health should return ok', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBe('ok');
    });
  });

  describe('2. User Registration', () => {
    it('POST /api/v1/auth/register - Register Customer successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Customer',
          email: testCustomerEmail,
          phone: testCustomerPhone,
          password: testPassword,
          role: UserRole.CUSTOMER,
        })
        .expect(200);

      expect(response.body.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(Msg.OTP_SENT);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.email).toBe(testCustomerEmail.toLowerCase());
      expect(response.body.data.role).toBe(UserRole.CUSTOMER);
      expect(response.body.data.status).toBe(UserStatus.ACTIVE);
      expect(response.body.data.otp).toBeDefined();

      customerOtp = response.body.data.otp;
    });

    it('POST /api/v1/auth/register - Prevent duplicate email registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate Customer',
          email: testCustomerEmail,
          phone: `+1888${Math.floor(100000 + Math.random() * 900000)}`,
          password: testPassword,
          role: UserRole.CUSTOMER,
        })
        .expect(200);

      expect(response.body.statusCode).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(Msg.USER_EXISTS);
    });

    it('POST /api/v1/auth/register - Prevent public Admin registration', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Hacker Admin',
          email: `hacker_${timestamp}@yopmail.com`,
          password: 'hackedpassword',
          role: UserRole.ADMIN,
        })
        .expect(200);

      expect(response.body.statusCode).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(Msg.FORBIDDEN);
    });

    it('POST /api/v1/auth/register - Register Company successfully', async () => {
      const companyEmail = `company_${timestamp}@yopmail.com`;
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({
          name: 'Tech Services Corp',
          email: companyEmail,
          password: testPassword,
          role: UserRole.COMPANY,
          companyName: 'Tech Services LLC',
          authorizedPersonName: 'Alice Manager',
        })
        .expect(200);

      expect(response.body.statusCode).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe(UserRole.COMPANY);
      expect(response.body.data.status).toBe(UserStatus.PENDING);
    });
  });

  describe('3. Verify OTP & Resend OTP', () => {
    it('POST /api/v1/auth/verify-otp - Fail with invalid OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testCustomerEmail,
          otp: '000000',
        })
        .expect(200);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(Msg.OTP_INVALID);
    });

    it('POST /api/v1/auth/resend-otp - Resend new OTP successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/resend-otp')
        .send({
          email: testCustomerEmail,
        })
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(Msg.OTP_RESENT);
      expect(response.body.data.otp).toBeDefined();

      // Update customerOtp with the resent OTP
      customerOtp = response.body.data.otp;
    });

    it('POST /api/v1/auth/verify-otp - Verify with valid OTP', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testCustomerEmail,
          otp: customerOtp,
        })
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(Msg.OTP_VERIFIED);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.isEmailVerified).toBe(true);
    });

    it('POST /api/v1/auth/verify-otp - Reject if already verified', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/verify-otp')
        .send({
          email: testCustomerEmail,
          otp: customerOtp,
        })
        .expect(200);

      expect(response.body.statusCode).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(Msg.USER_ALREADY_VERIFIED);
    });
  });

  describe('4. Login Flow', () => {
    it('POST /api/v1/auth/login - Fail with incorrect password', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testCustomerEmail,
          password: 'wrongpassword',
        })
        .expect(200);

      expect(response.body.statusCode).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(Msg.INVALID_CREDENTIALS);
    });

    it('POST /api/v1/auth/login - Login successfully as Customer', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: testCustomerEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(Msg.LOGIN_SUCCESS);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.email).toBe(testCustomerEmail.toLowerCase());
      expect(response.body.data.user.isEmailVerified).toBe(true);
    });

    it('POST /api/v1/auth/login - Login successfully as seeded Admin', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({
          email: 'admin@yopmail.com',
          password: 'admin1234',
        })
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(Msg.LOGIN_SUCCESS);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.role).toBe(UserRole.ADMIN);
      expect(response.body.data.user.email).toBe('admin@yopmail.com');
    });
  });
});
