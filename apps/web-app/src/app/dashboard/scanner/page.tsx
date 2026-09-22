"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { apiClient, ApiError } from "@/lib/api-client";

type ScanMode = "EXTERNAL" | "CAMERA";

interface VerifiedStudent {
  id: string;
  firstName: string;
  lastName: string;
  studentNumber: string;
  status: string;
}

export default function ScannerPage() {
  const [mode, setMode] = useState<ScanMode>("EXTERNAL");
  
  // Results & Loading
  const [loading, setLoading] = useState(false);
  const [successResult, setSuccessResult] = useState<VerifiedStudent | null>(null);
  const [errorResult, setErrorResult] = useState<string | null>(null);

  // External Scanner Input State
  const [externalInput, setExternalInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus management for External Scanner
  useEffect(() => {
    if (mode === "EXTERNAL" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [mode]);

  const maintainFocus = () => {
    if (mode === "EXTERNAL" && inputRef.current) {
      inputRef.current.focus();
    }
  };

  const processScan = async (rawToken: string, source: ScanMode) => {
    try {
      setLoading(true);
      setSuccessResult(null);
      setErrorResult(null);

      const response = (await apiClient.post(`/api/v1/id-cards/scan`, {
        token: rawToken,
        source,
      })) as { success: boolean; student: VerifiedStudent };

      setSuccessResult(response.student);

      // Clear success message after 5 seconds to get ready for next scan
      setTimeout(() => setSuccessResult(null), 5000);
      
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorResult(err.message);
      } else {
        setErrorResult("Credential could not be verified");
      }
      // Clear error after 5 seconds
      setTimeout(() => setErrorResult(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  // External Scanner Handlers
  const handleExternalKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault(); // Prevent form submission
      
      const tokenToProcess = externalInput.trim();
      setExternalInput(""); // Clear immediately for security and next scan
      
      if (tokenToProcess) {
        processScan(tokenToProcess, "EXTERNAL");
      }
    }
  };

  // Camera Scanner Setup
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (mode === "CAMERA") {
      // Small delay to ensure the DOM element exists
      const timer = setTimeout(() => {
        scanner = new Html5QrcodeScanner(
          "camera-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        );

        scanner.render(
          (decodedText) => {
            // Once a scan is successful, pause scanning briefly
            scanner?.pause(true);
            processScan(decodedText, "CAMERA").then(() => {
              // Resume after processing
              setTimeout(() => scanner?.resume(), 2000);
            });
          },
          (errorMessage) => {
            // Ignore ongoing scan failures
          }
        );
      }, 100);
      
      return () => {
        clearTimeout(timer);
        if (scanner) {
          scanner.clear().catch(console.error);
        }
      };
    }
  }, [mode]);

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-[80vh] flex flex-col" onClick={maintainFocus}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">ID Verification Scanner</h1>
        <p className="text-gray-500 mt-2 text-lg">Securely scan and verify student ID cards</p>
      </div>

      <div className="flex gap-4 mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
        <button
          onClick={() => setMode("EXTERNAL")}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mode === "EXTERNAL" 
              ? "bg-brand-navy text-white shadow-md scale-105" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            External Scanner (USB/HID)
          </div>
        </button>
        <button
          onClick={() => setMode("CAMERA")}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mode === "CAMERA" 
              ? "bg-brand-navy text-white shadow-md scale-105" 
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Device Camera
          </div>
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Scanner Input Area */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col items-center justify-center">
          
          {mode === "EXTERNAL" ? (
            <div className="w-full max-w-sm text-center">
              <div className="mb-6 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-full inline-block">
                <svg className="w-16 h-16 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2 dark:text-white">Ready to Scan</h3>
              <p className="text-sm text-gray-500 mb-8">Ensure your cursor is in the field below and scan the ID card.</p>
              
              <input
                ref={inputRef}
                type="text" // Explicitly NOT password, just standard text input
                className="w-full px-4 py-3 text-center bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 rounded-lg outline-none transition-all dark:text-white"
                placeholder="Scan Barcode / QR Here..."
                value={externalInput}
                onChange={(e) => setExternalInput(e.target.value)}
                onKeyDown={handleExternalKeyDown}
                onBlur={() => {
                  // Wait slightly to prevent race conditions during rapid scanning
                  setTimeout(() => inputRef.current?.focus(), 10);
                }}
                autoFocus
              />
            </div>
          ) : (
            <div className="w-full max-w-sm">
              <div id="camera-reader" className="w-full rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-600"></div>
              <p className="text-center text-sm text-gray-500 mt-4">Position the QR code within the frame.</p>
            </div>
          )}

        </div>

        {/* Right Side: Scan Results */}
        <div className="flex flex-col justify-center">
          {loading ? (
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-20 h-20 bg-gray-200 rounded-full mb-6"></div>
              <div className="h-6 w-48 bg-gray-200 rounded mb-4"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          ) : successResult ? (
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-2xl p-8 text-center animate-in zoom-in duration-300">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-green-100 dark:bg-green-800 mb-6">
                <svg className="h-12 w-12 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-green-800 dark:text-green-400 mb-2">Verified</h2>
              <p className="text-xl font-medium text-gray-900 dark:text-white mb-1">
                {successResult.firstName} {successResult.lastName}
              </p>
              <p className="text-gray-500">ID: {successResult.studentNumber}</p>
            </div>
          ) : errorResult ? (
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-2xl p-8 text-center animate-in shake duration-300">
              <div className="mx-auto flex items-center justify-center h-24 w-24 rounded-full bg-red-100 dark:bg-red-800 mb-6">
                <svg className="h-12 w-12 text-red-600 dark:text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-red-800 dark:text-red-400 mb-2">Failed</h2>
              <p className="text-lg text-red-600 dark:text-red-300">{errorResult}</p>
            </div>
          ) : (
            <div className="text-center p-8 opacity-50">
              <svg className="mx-auto h-24 w-24 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-xl font-medium text-gray-400 dark:text-gray-500">Waiting for Scan...</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
