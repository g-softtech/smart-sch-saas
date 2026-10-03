import { PrismaClient, StaffType, TransportRouteDirection, TransportVehicleStatus, TransportRouteStatus, TransportSubscriptionStatus } from '@saas/core-platform';
import { FleetService } from '../src/modules/transport/services/fleet.service';
import { RouteService } from '../src/modules/transport/services/route.service';
import { SubscriptionService } from '../src/modules/transport/services/subscription.service';
import { kernel, tenantContext, AuditService, AuditMaskingService, AuditRetentionPolicy } from '@saas/core-platform';
import assert from 'assert';

const testDbUrl = 'postgresql://schoolos:schoolos_password@localhost:5432/schoolos_db';
const prisma = new PrismaClient({ datasources: { db: { url: testDbUrl } } });
kernel.db = prisma;

async function runTest() {
  console.log('Starting 6D Transport Isolated Test...');
  const ts = Date.now();
  const tenantId = 'test-tenant-' + ts;
  const schoolId = 'test-school-' + ts;
  const campusA = 'campus-A-' + ts;
  const campusB = 'campus-B-' + ts;
  const userId = 'admin-' + ts;

  const auditService = new AuditService(new AuditMaskingService(), new AuditRetentionPolicy());
  const fleetService = new FleetService(auditService);
  const routeService = new RouteService(auditService);
  const subService = new SubscriptionService(auditService);

  await tenantContext.run({ tenantId }, async () => {
    // 1. Setup isolated data
    await prisma.user.create({ data: { id: userId, email: userId + '@example.com' } }).catch(() => {});
    await prisma.tenant.create({ data: { id: tenantId, name: 'Test Tenant', slug: tenantId } }).catch(() => {});
    await prisma.school.create({ data: { id: schoolId, tenantId, name: 'Test School' } }).catch(() => {});
    
    await prisma.campus.create({ data: { id: campusA, tenantId, schoolId, name: 'Campus A' }}).catch(() => {});
    await prisma.campus.create({ data: { id: campusB, tenantId, schoolId, name: 'Campus B' }}).catch(() => {});
    
    const ay = await prisma.academicYear.create({ data: { tenantId, schoolId, name: 'AY-' + ts, startDate: new Date(), endDate: new Date() }});
    const term1 = await prisma.term.create({ data: { tenantId, academicYearId: ay.id, name: 'Term1-' + ts, startDate: new Date(), endDate: new Date() }});
    const term2 = await prisma.term.create({ data: { tenantId, academicYearId: ay.id, name: 'Term2-' + ts, startDate: new Date(), endDate: new Date() }});
    
    const driverId = 'driver-' + ts;
    await prisma.staffProfile.create({ data: { id: driverId, tenantId, schoolId, staffNumber: 'STF-D1-' + ts, firstName: 'D', lastName: '1', gender: 'MALE', status: 'ACTIVE', joiningDate: new Date(), type: StaffType.SUPPORT } }).catch(() => {});
    const wrongDriverId = 'driver-wrong-' + ts;
    await prisma.staffProfile.create({ data: { id: wrongDriverId, tenantId, schoolId, staffNumber: 'STF-DW-' + ts, firstName: 'D', lastName: 'W', gender: 'MALE', status: 'ACTIVE', joiningDate: new Date(), type: StaffType.TEACHING } }).catch(() => {});
    
    const studentA = await prisma.student.create({ data: { id: 'student-A-' + ts, tenantId, schoolId, studentNumber: 'STU-A-' + ts, firstName: 'A', lastName: 'A', gender: 'MALE', admissionDate: new Date(), status: 'ACTIVE' }});
    const studentB = await prisma.student.create({ data: { id: 'student-B-' + ts, tenantId, schoolId, studentNumber: 'STU-B-' + ts, firstName: 'B', lastName: 'B', gender: 'MALE', admissionDate: new Date(), status: 'ACTIVE' }});

    // 2. Fleet creation
    const v1 = await fleetService.createVehicle(tenantId, schoolId, userId, { registrationNumber: 'V-001-' + ts, capacity: 10 });
    assert.strictEqual(v1.status, TransportVehicleStatus.ACTIVE);

    // 3. Route & Stops creation
    const route1 = await routeService.createRoute(tenantId, schoolId, userId, { name: 'Morning Route 1', direction: TransportRouteDirection.PICKUP, campusId: campusA });
    const route2 = await routeService.createRoute(tenantId, schoolId, userId, { name: 'Morning Route 2', direction: TransportRouteDirection.PICKUP, campusId: campusA });
    const routeDrop = await routeService.createRoute(tenantId, schoolId, userId, { name: 'Afternoon Route', direction: TransportRouteDirection.DROP_OFF, campusId: campusA });

    await routeService.syncStops(tenantId, schoolId, route1.id, userId, { stops: [{ name: 'Stop 1', orderIndex: 1 }] });
    await routeService.syncStops(tenantId, schoolId, route2.id, userId, { stops: [{ name: 'Stop 2', orderIndex: 1 }] });
    await routeService.syncStops(tenantId, schoolId, routeDrop.id, userId, { stops: [{ name: 'Stop 3', orderIndex: 1 }] });

    const stops1 = await prisma.transportRouteStop.findMany({ where: { routeId: route1.id }});
    const stops2 = await prisma.transportRouteStop.findMany({ where: { routeId: route2.id }});
    const stopsDrop = await prisma.transportRouteStop.findMany({ where: { routeId: routeDrop.id }});

    // 4. Invalid driver allocation
    try {
      await routeService.createAllocation(tenantId, schoolId, route1.id, userId, { academicYearId: ay.id, termId: term1.id, vehicleId: v1.id, driverId: wrongDriverId });
      assert.fail('Should reject TEACHING staff as driver');
    } catch(e: any) { assert(e.status === 403); }

    // 5. Valid allocation
    const alloc1 = await routeService.createAllocation(tenantId, schoolId, route1.id, userId, { academicYearId: ay.id, termId: term1.id, vehicleId: v1.id, driverId: driverId });
    const alloc2 = await routeService.createAllocation(tenantId, schoolId, route2.id, userId, { academicYearId: ay.id, termId: term1.id, vehicleId: v1.id, driverId: driverId });
    const allocDrop = await routeService.createAllocation(tenantId, schoolId, routeDrop.id, userId, { academicYearId: ay.id, termId: term1.id, vehicleId: v1.id, driverId: driverId });

    // 7. Same direction concurrent lock
    const p1 = subService.createSubscription(tenantId, schoolId, userId, { studentId: studentA.id, academicYearId: ay.id, termId: term1.id, routeAllocationId: alloc1.id, stopId: stops1[0].id, direction: TransportRouteDirection.PICKUP }).catch(e => e);
    const p2 = subService.createSubscription(tenantId, schoolId, userId, { studentId: studentA.id, academicYearId: ay.id, termId: term1.id, routeAllocationId: alloc2.id, stopId: stops2[0].id, direction: TransportRouteDirection.PICKUP }).catch(e => e);
    const results = await Promise.all([p1, p2]);
    console.log('STEP7 RAW:', JSON.stringify(results.map(r => ({ id: r?.id, status: r?.status, msg: r?.message, resp: r?.response }))));
    const succ = results.filter(r => r && r.id && r.status === 'ACTIVE');
    const fail = results.filter(r => r && (r.status === 409 || r.response));
    assert.strictEqual(succ.length, 1);
    assert.strictEqual(fail.length, 1);

    // 8. Both directions independence
    const dropSub = await subService.createSubscription(tenantId, schoolId, userId, { studentId: studentA.id, academicYearId: ay.id, termId: term1.id, routeAllocationId: allocDrop.id, stopId: stopsDrop[0].id, direction: TransportRouteDirection.DROP_OFF });
    assert.strictEqual(dropSub.status, TransportSubscriptionStatus.ACTIVE);

    // 9. Cancel and replace
    const subToCancel = succ[0];
    await subService.cancelSubscription(tenantId, schoolId, subToCancel.id, userId);
    
    // Now we can replace
    const replacement = await subService.createSubscription(tenantId, schoolId, userId, { studentId: studentA.id, academicYearId: ay.id, termId: term1.id, routeAllocationId: alloc2.id, stopId: stops2[0].id, direction: TransportRouteDirection.PICKUP });
    assert.strictEqual(replacement.status, TransportSubscriptionStatus.ACTIVE);

    // 10. Capacity test race condition
    const promises = [];
    for(let i=0; i<8; i++) {
      const sId = 'student-cap-' + i + '-' + ts;
      await prisma.student.create({ data: { id: sId, tenantId, schoolId, studentNumber: 'STU-C'+i+'-'+ts, firstName: 'C', lastName: 'C', gender: 'MALE', admissionDate: new Date(), status: 'ACTIVE' }});
      await subService.createSubscription(tenantId, schoolId, userId, { studentId: sId, academicYearId: ay.id, termId: term1.id, routeAllocationId: alloc2.id, stopId: stops2[0].id, direction: TransportRouteDirection.PICKUP });
    }

    const racePromises = [];
    for(let i=0; i<10; i++) {
      const sId = 'student-race-' + i + '-' + ts;
      await prisma.student.create({ data: { id: sId, tenantId, schoolId, studentNumber: 'STU-R'+i+'-'+ts, firstName: 'R', lastName: 'R', gender: 'MALE', admissionDate: new Date(), status: 'ACTIVE' }});
      racePromises.push(subService.createSubscription(tenantId, schoolId, userId, { studentId: sId, academicYearId: ay.id, termId: term1.id, routeAllocationId: alloc2.id, stopId: stops2[0].id, direction: TransportRouteDirection.PICKUP }).catch(e => e));
    }
    const raceResults = await Promise.all(racePromises);
    const raceSucc = raceResults.filter(r => !r.status || r.status === TransportSubscriptionStatus.ACTIVE);
    const raceFail = raceResults.filter(r => r.status === 409);
    
    console.log("STEP7 RESULTS:", JSON.stringify(results.map(r => ({ id: r.id, status: r.status, message: r.message })))); assert.strictEqual(raceSucc.length, 1);
    assert.strictEqual(raceFail.length, 9);

    // 11. Deletion Blocks
    try {
      await fleetService.deleteVehicle(tenantId, schoolId, v1.id, userId);
      assert.fail('Should block vehicle deletion because of allocation');
    } catch(e: any) { assert(e.status === 409); }

    // 12. Historical allocation integrity
    const allocTerm2 = await routeService.createAllocation(tenantId, schoolId, route2.id, userId, { academicYearId: ay.id, termId: term2.id, vehicleId: v1.id, driverId: driverId });
    assert(allocTerm2.id !== alloc2.id);

    console.log('ALL 6D VERIFICATION CHECKS PASSED!');
  });
}

runTest().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => prisma.$disconnect());





