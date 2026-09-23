"use client";

import React from "react";
import { QRCodeSVG } from "qrcode.react";

export interface PhysicalIdCardStudent {
  firstName: string;
  lastName: string;
  middleName?: string | null;
  studentNumber: string;
  // Missing backend fields - documented for future schema addition
  className?: string; // Requires enrollment fetching
  armName?: string;
  photoUrl?: string; // Missing in backend
}

export interface PhysicalIdCardSchool {
  name: string;
  // Missing backend fields - documented for future schema addition
  logoUrl?: string;
  address?: string;
  motto?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface PhysicalIdCardProps {
  student: PhysicalIdCardStudent;
  school: PhysicalIdCardSchool;
  qrToken: string;
}

export default function PhysicalIdCard({
  student,
  school,
  qrToken,
}: PhysicalIdCardProps) {
  const fullName = [student.firstName, student.middleName, student.lastName]
    .filter(Boolean)
    .join(" ");

  // Use provided colors or fallback to default SchoolOS branding
  const primaryColor = school.primaryColor || "#1e3a8a"; // brand-navy
  const secondaryColor = school.secondaryColor || "#0f766e"; // brand-teal

  return (
    <div className="flex flex-col items-center gap-6 print:block">
      {/* FRONT OF CARD */}
      <div
        className="relative overflow-hidden bg-[#FAFAFA] border border-gray-300 shadow-xl print:shadow-none print:border-none rounded-xl print:rounded-none flex flex-col"
        style={{
          width: "85.6mm",
          height: "54mm",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        {/* Top Header Bar */}
        <div
          className="w-full h-10 flex items-center justify-center px-4"
          style={{ backgroundColor: primaryColor }}
        >
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={school.logoUrl}
              alt="School Logo"
              className="h-6 max-w-full object-contain mr-2"
            />
          ) : (
            <div className="h-6 w-6 bg-white/20 rounded-full mr-2 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
              {school.name.charAt(0)}
            </div>
          )}
          <h1 className="text-white font-bold text-xs uppercase tracking-wide truncate">
            {school.name}
          </h1>
        </div>

        <div className="flex-1 flex p-3 gap-3">
          {/* Photo Section */}
          <div className="w-[24mm] shrink-0 flex flex-col items-center">
            <div className="w-full aspect-[3/4] bg-gray-100 border border-gray-200 rounded overflow-hidden flex items-center justify-center relative">
              {student.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={student.photoUrl}
                  alt="Student"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center text-gray-400 flex flex-col items-center justify-center">
                  <svg
                    className="w-8 h-8 mb-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-[7px] uppercase font-semibold">
                    No Photo
                  </span>
                </div>
              )}
            </div>

            <div className="mt-1 w-full text-center">
              <span className="text-[8px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full inline-block truncate w-full">
                {student.studentNumber}
              </span>
            </div>
          </div>

          {/* Details & QR Section */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-gray-900 leading-tight tracking-tight uppercase">
                {fullName}
              </h2>

              <div className="mt-1 space-y-0.5">
                <div className="text-[9px]">
                  <span className="text-gray-500 font-medium">Class: </span>
                  <span className="font-semibold text-gray-800">
                    {student.className || (
                      <span className="text-gray-400 italic">Unassigned</span>
                    )}
                  </span>
                </div>
                {student.armName && (
                  <div className="text-[9px]">
                    <span className="text-gray-500 font-medium">Arm: </span>
                    <span className="font-semibold text-gray-800">
                      {student.armName}
                    </span>
                  </div>
                )}
                <div className="text-[9px]">
                  <span className="text-gray-500 font-medium">Role: </span>
                  <span className="font-semibold text-gray-800 uppercase">
                    Student
                  </span>
                </div>
              </div>
            </div>

            {/* QR Code - Secondary Element */}
            <div className="self-end mt-auto flex items-end justify-end">
              <div className="bg-white p-0.5 rounded border border-gray-200 shadow-sm">
                <QRCodeSVG value={qrToken} size={40} level="H" />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Accent Line */}
        <div
          className="w-full h-1 absolute bottom-0 left-0"
          style={{ backgroundColor: secondaryColor }}
        ></div>
      </div>

      {/* BACK OF CARD */}
      <div
        className="relative overflow-hidden bg-[#FAFAFA] border border-gray-300 shadow-xl print:shadow-none print:border-none rounded-xl print:rounded-none flex flex-col print:mt-4"
        style={{
          width: "85.6mm",
          height: "54mm",
          printColorAdjust: "exact",
          WebkitPrintColorAdjust: "exact",
        }}
      >
        <div className="flex-1 p-4 flex flex-col">
          <div className="mb-2">
            <h3 className="text-[10px] font-bold text-gray-800 uppercase border-b border-gray-200 pb-1 mb-1">
              Instructions
            </h3>
            <ul className="text-[8px] text-gray-600 space-y-1 list-disc pl-3">
              <li>This card is the property of {school.name}.</li>
              <li>It must be worn at all times while on school premises.</li>
              <li>
                Present this card for scanning during arrival, departure, and
                designated academic activities.
              </li>
              <li>
                Loss of this card must be reported immediately to the school
                administration.
              </li>
            </ul>
          </div>

          <div className="mt-auto pt-2 border-t border-gray-200 text-center">
            <p className="text-[8px] font-bold text-gray-800">
              If found, please return to:
            </p>
            <p className="text-[9px] font-bold text-gray-900 mt-0.5">
              {school.name}
            </p>
            {school.address ? (
              <p className="text-[8px] text-gray-600 mt-0.5">
                {school.address}
              </p>
            ) : (
              <p className="text-[8px] text-gray-400 italic mt-0.5">
                [Address not configured]
              </p>
            )}
            {school.motto && (
              <p className="text-[7px] italic text-gray-500 mt-1">
                &quot;{school.motto}&quot;
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
