import dotenv from 'dotenv';
dotenv.config();
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== TESTING ACTUAL HTTP API RESPONSE FOR ATTENDANCE ROSTER ===');

  const tenant = await prisma.tenant.findFirst();
  const school = await prisma.school.findFirst();
  const class1B = await prisma.class.findFirst({ where: { name: 'Grade 1B' } });

  if (!tenant || !school || !class1B) {
    console.log('Missing tenant, school, or class');
    return;
  }

  // Get admin JWT token by logging in to local API
  const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@schoolos.com', password: 'Password123!' })
  });

  const loginData = await loginRes.json();
  console.log('Login Status:', loginRes.status);
  
  if (!loginData.accessToken) {
    console.error('Failed to authenticate:', loginData);
    return;
  }

  const token = loginData.accessToken;

  // Make HTTP GET request to eligible-students
  const url = `http://localhost:3001/api/v1/attendance/eligible-students?classId=${class1B.id}&date=2026-09-26`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': tenant.id,
      'x-school-id': school.id
    }
  });

  const data = await res.json();
  console.log('Eligible Students HTTP Response Status:', res.status);
  console.log('Eligible Students HTTP Response Data:', JSON.stringify(data, null, 2));
  console.log(`HTTP Response returned ${Array.isArray(data) ? data.length : 0} students`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
