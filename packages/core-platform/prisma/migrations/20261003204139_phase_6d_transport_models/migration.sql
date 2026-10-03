-- CreateEnum
CREATE TYPE "TransportVehicleStatus" AS ENUM ('ACTIVE', 'IN_MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "TransportRouteDirection" AS ENUM ('PICKUP', 'DROP_OFF');

-- CreateEnum
CREATE TYPE "TransportRouteStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "TransportSubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- DropIndex
-- DROP INDEX "acd_gradebook_submissions_tenantId_schoolId_academicYearId__key";

-- CreateTable
CREATE TABLE "trp_vehicles" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "registrationNumber" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "status" "TransportVehicleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trp_routes" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "campusId" TEXT,
    "name" TEXT NOT NULL,
    "direction" "TransportRouteDirection" NOT NULL,
    "status" "TransportRouteStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trp_route_stops" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "estimatedTime" TEXT,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trp_route_allocations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_route_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trp_subscriptions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "routeAllocationId" TEXT NOT NULL,
    "stopId" TEXT NOT NULL,
    "direction" "TransportRouteDirection" NOT NULL,
    "status" "TransportSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trp_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trp_vehicles_tenantId_schoolId_idx" ON "trp_vehicles"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "trp_vehicles_tenantId_registrationNumber_key" ON "trp_vehicles"("tenantId", "registrationNumber");

-- CreateIndex
CREATE INDEX "trp_routes_tenantId_schoolId_idx" ON "trp_routes"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "trp_route_stops_routeId_idx" ON "trp_route_stops"("routeId");

-- CreateIndex
CREATE INDEX "trp_route_allocations_tenantId_schoolId_idx" ON "trp_route_allocations"("tenantId", "schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "trp_route_allocations_tenantId_schoolId_routeId_termId_key" ON "trp_route_allocations"("tenantId", "schoolId", "routeId", "termId");

-- CreateIndex
CREATE INDEX "trp_subscriptions_tenantId_schoolId_studentId_idx" ON "trp_subscriptions"("tenantId", "schoolId", "studentId");

-- CreateIndex
CREATE INDEX "trp_subscriptions_routeAllocationId_idx" ON "trp_subscriptions"("routeAllocationId");

-- AddForeignKey
ALTER TABLE "trp_vehicles" ADD CONSTRAINT "trp_vehicles_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_vehicles" ADD CONSTRAINT "trp_vehicles_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_vehicles" ADD CONSTRAINT "trp_vehicles_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_routes" ADD CONSTRAINT "trp_routes_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "acd_campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_routes" ADD CONSTRAINT "trp_routes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_routes" ADD CONSTRAINT "trp_routes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_stops" ADD CONSTRAINT "trp_route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "trp_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "stf_staff_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "trp_routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_route_allocations" ADD CONSTRAINT "trp_route_allocations_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "trp_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "acd_academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_termId_fkey" FOREIGN KEY ("termId") REFERENCES "acd_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "stud_students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "plt_tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_routeAllocationId_fkey" FOREIGN KEY ("routeAllocationId") REFERENCES "trp_route_allocations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trp_subscriptions" ADD CONSTRAINT "trp_subscriptions_stopId_fkey" FOREIGN KEY ("stopId") REFERENCES "trp_route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

