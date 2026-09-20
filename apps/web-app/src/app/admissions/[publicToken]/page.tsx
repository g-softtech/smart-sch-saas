"use client";

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';

interface FormConfig {
  title: string;
  academicYear?: string;
  targetClass?: string;
  fieldsSchema?: Record<string, { type: string; label?: string; required?: boolean; options?: string[]; maxLength?: number; minLength?: number }>;
}

export default function PublicAdmissionsPage() {
  const params = useParams();
  const publicToken = params.publicToken as string;

  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core Applicant State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('MALE'); // default
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Dynamic Form Data State
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [trackingToken, setTrackingToken] = useState<string | null>(null);

  const fetchFormConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const config = await apiClient.get(`public/admissions/forms/${publicToken}`, { requireAuth: false });
      if (config) {
        setFormConfig(config as FormConfig);
      } else {
        setError('Form configuration not found.');
      }
    } catch (err: unknown) {
      setError(err instanceof ApiError && err.status === 404 ? 'This admission form does not exist or has been closed.' : 'Failed to load admission form.');
    } finally {
      setLoading(false);
    }
  }, [publicToken]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFormConfig();
  }, [fetchFormConfig]);

  const handleDynamicChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent double submission
    
    setSubmitting(true);
    setSubmitError(null);
    
    try {
      const res = await apiClient.post(`public/admissions/applications/${publicToken}`, {
        applicant: {
          firstName,
          lastName,
          gender,
          dateOfBirth
        },
        formData
      }, { requireAuth: false });

      if (res && res.trackingToken) {
        setTrackingToken(res.trackingToken);
      } else {
        throw new Error('Failed to generate tracking token.');
      }
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading form...</div>
      </div>
    );
  }

  if (error || !formConfig) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white shadow rounded-lg p-6 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 mb-2">Form Unavailable</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (trackingToken) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-emerald-600 px-6 py-8 text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-emerald-500 mb-4 shadow-sm border-4 border-emerald-400">
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Application Submitted!</h2>
            <p className="text-emerald-100">Thank you for applying to {formConfig.title}.</p>
          </div>
          <div className="px-8 py-8 bg-white text-center">
            <p className="text-sm text-gray-500 mb-4">Please save your unique tracking token below. You may need it for future reference.</p>
            <div className="bg-gray-100 p-4 rounded-md border border-gray-200">
              <code className="text-lg font-mono font-bold text-gray-900 break-all">{trackingToken}</code>
            </div>
            <p className="text-xs text-gray-400 mt-6">
              You may now close this window. We will contact you once the initial review is complete.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const dynamicFields = formConfig.fieldsSchema || {};

  return (
    <div className="min-h-screen bg-[#0A192F] flex flex-col py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-2xl w-full mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            {formConfig.title}
          </h2>
          <p className="mt-2 text-sm text-gray-300">
            {formConfig.academicYear && formConfig.targetClass 
              ? `Admissions for ${formConfig.academicYear} - ${formConfig.targetClass}` 
              : 'Please complete the application form below'}
          </p>
        </div>

        {/* Form Container */}
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-lg sm:px-10 border-t-4 border-[#D4AF37]">
          <form className="space-y-6" onSubmit={handleSubmit}>
            
            {submitError && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Submission Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{submitError}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                Applicant Demographics
              </h3>
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">First Name</label>
                  <div className="mt-1">
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">Last Name</label>
                  <div className="mt-1">
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700">Gender</label>
                  <div className="mt-1">
                    <select
                      id="gender"
                      name="gender"
                      required
                      value={gender}
                      onChange={e => setGender(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <div className="mt-1">
                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      required
                      value={dateOfBirth}
                      onChange={e => setDateOfBirth(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Fields Section */}
            {Object.keys(dynamicFields).length > 0 && (
              <div className="pt-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 border-b border-gray-200 pb-2 mb-4">
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 gap-y-6">
                  {Object.entries(dynamicFields).map(([key, config]) => (
                    <div key={key}>
                      <label htmlFor={key} className="block text-sm font-medium text-gray-700">
                        {config.label || key}
                        {config.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <div className="mt-1">
                        {config.type === 'select' ? (
                          <select
                            id={key}
                            required={config.required}
                            value={formData[key] || ''}
                            onChange={e => handleDynamicChange(key, e.target.value)}
                            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
                          >
                            <option value="">Select an option</option>
                            {config.options?.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        ) : config.type === 'boolean' ? (
                          <div className="flex items-center h-full pt-2">
                            <input
                              id={key}
                              type="checkbox"
                              required={config.required}
                              checked={formData[key] === 'true'}
                              onChange={e => handleDynamicChange(key, e.target.checked ? 'true' : 'false')}
                              className="h-4 w-4 text-[#D4AF37] focus:ring-[#D4AF37] border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-500">Yes</span>
                          </div>
                        ) : (
                          <input
                            id={key}
                            type={config.type === 'date' ? 'date' : config.type === 'number' ? 'number' : 'text'}
                            required={config.required}
                            maxLength={config.maxLength}
                            minLength={config.minLength}
                            value={formData[key] || ''}
                            onChange={e => handleDynamicChange(key, e.target.value)}
                            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-[#D4AF37] focus:border-[#D4AF37] sm:text-sm"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-6">
              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-[#D4AF37] hover:bg-[#B3932E] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#D4AF37] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting Application...' : 'Submit Application'}
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">
                By submitting this application, you agree to the institution&apos;s admission policies.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
