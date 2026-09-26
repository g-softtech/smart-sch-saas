import dotenv from 'dotenv';
dotenv.config();
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../apps/api-gateway/src/app.module';

async function main() {
  console.log('=== STARTING LIVE API GATEWAY ON PORT 3001 ===');
  process.env.PORT = '3005';

  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: false }));
  app.enableCors({ origin: '*' });

  await app.listen(3005);
  console.log('API Gateway listening on http://localhost:3005');

  // Step 1: Login
  const loginRes = await fetch('http://localhost:3005/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@schoolos.com', password: 'Password123!' })
  });

  const loginData = await loginRes.json();
  console.log('\nLogin HTTP Status:', loginRes.status);
  console.log('Login User Email:', loginData.user?.email);
  console.log('Login User Role:', loginData.user?.globalRole);

  const token = loginData.accessToken;
  const tenantId = loginData.tenantId || '097c6dc2-1383-447b-a5eb-97ef631f6cff';
  const schoolId = 'bed1c50b-7cf0-4941-82c0-5afcf3b21bd7';
  const classId = 'e68e25c3-bc63-41be-b61b-677ee8b5e4f7'; // Grade 1B

  // Step 2: Request eligible students via HTTP API
  const eligibleUrl = `http://localhost:3005/api/v1/attendance/eligible-students?classId=${classId}&date=2026-09-26`;
  const eligibleRes = await fetch(eligibleUrl, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenantId,
      'x-school-id': schoolId
    }
  });

  const eligibleData = await eligibleRes.json();
  console.log('\nEligible Students HTTP Status:', eligibleRes.status);
  console.log('Eligible Students Returned Count:', Array.isArray(eligibleData) ? eligibleData.length : 0);
  console.log('Eligible Students Data:', JSON.stringify(eligibleData, null, 2));

  await app.close();
}

main().catch(console.error).finally(() => process.exit(0));
