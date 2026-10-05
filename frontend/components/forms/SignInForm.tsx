"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getDashboardPath } from "@/lib/roleRouting";

interface SignInFormProps {
  onSuccess?: () => void;
  onNavigateToSignUp?: () => void;
}

interface LoginApiResponse {
  success: boolean;
  message: string;
  data?: {
    token?: string;
    user?: {
      id: string;
      firstName?: string;
      lastName?: string | null;
      email?: string;
      role?: string;
      permissions?: string[];
    };
  };
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"
).replace(/\/+$/, "");

export default function SignInForm({
  onSuccess,
  onNavigateToSignUp,
}: SignInFormProps) {
  const router = useRouter();

  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Please enter both email address and password.");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      let result: LoginApiResponse | null = null;

      try {
        result = (await response.json()) as LoginApiResponse;
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(
          result?.message ||
          `Login failed with status ${response.status}.`
        );
      }

      const token = result?.data?.token;

      if (!token) {
        throw new Error(
          "Login succeeded but the server did not return an authentication token."
        );
      }

      /*
       * The CRM API client reads the JWT from localStorage.
       * Store the backend-issued token before navigating to the dashboard.
       */
      localStorage.setItem("token", token);

      /*
       * Remove stale token aliases so the application always uses
       * the newly issued JWT.
       */
      localStorage.removeItem("accessToken");
      localStorage.removeItem("authToken");

      /*
       * Store basic user information for frontend UI usage.
       * The JWT remains the source of authentication truth.
       */
      const loginUser = result?.data?.user;

      if (loginUser) {
        localStorage.setItem(
          "nleta_user",
          JSON.stringify(loginUser)
        );
      }

      /*
       * Keep the existing UI preference available.
       * Authentication currently uses localStorage because
       * leadService.ts reads the token from localStorage.
       */
      localStorage.setItem(
        "nleta_remember_me",
        rememberMe ? "true" : "false"
      );

      if (onSuccess) {
        onSuccess();
      } else {
        const userRole = result?.data?.user?.role;

        const dashboardPath = getDashboardPath(userRole);

        router.replace(dashboardPath);
        router.refresh();
      }
    } catch (err) {
      console.error("CRM login error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setError("Please enter your email above to receive a reset link.");
      return;
    }

    /*
     * Password-reset API is not wired in this Rev.1 frontend yet.
     * Keep the existing UI behavior without pretending that an
     * email was actually sent.
     */
    setError(
      "Password reset is not connected yet. Please contact the administrator."
    );
    setForgotSent(false);
  };

  return (
    <div className="w-full">
      {/* Error alert */}
      {error && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-error-200 bg-error-50 p-3.5 text-xs sm:text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-400">
          <svg
            className="w-4 h-4 shrink-0 text-error-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Forgot Password Success alert */}
      {forgotSent && (
        <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-success-200 bg-success-50 p-3.5 text-xs sm:text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-400">
          <svg
            className="w-4 h-4 shrink-0 text-success-500"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Password reset link sent to <strong>{email}</strong>!
          </span>
        </div>
      )}

      {/* Form Fields */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Address */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Email Address <span className="text-error-500">*</span>
          </label>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400 dark:text-gray-500">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>

            <input
              type="email"
              autoComplete="email"
              placeholder="nletacrm@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent ps-10 pe-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
              required
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              Password <span className="text-error-500">*</span>
            </label>

            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs font-medium text-brand-600 transition hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
            >
              Forgot password?
            </button>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-gray-400 dark:text-gray-500">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>

            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 w-full rounded-xl border border-gray-300 bg-transparent ps-10 pe-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white dark:placeholder:text-gray-500 dark:focus:border-brand-400"
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
              className="absolute inset-y-0 end-0 flex items-center pe-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z"
                    clipRule="evenodd"
                  />
                  <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember me */}
        <div className="flex items-center">
          <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800"
            />
            Keep me signed in on this device
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 text-sm font-semibold text-white shadow-md shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/35 focus:outline-hidden focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 cursor-pointer"
        >
          {loading ? (
            <>
              <svg
                className="h-4 w-4 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <svg
                className="w-4 h-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 10h12" />
                <path d="M11 5l5 5-5 5" />
              </svg>
            </>
          )}
        </button>
      </form>

      {/* Switch to Sign Up */}
      <div className="mt-6 pt-5 border-t border-gray-100 dark:border-gray-800/80 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account yet?{" "}
        {onNavigateToSignUp ? (
          <button
            type="button"
            onClick={onNavigateToSignUp}
            className="font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
          >
            Create an Account
          </button>
        ) : (
          <Link
            href="/signup"
            className="font-semibold text-brand-600 hover:text-brand-700 hover:underline dark:text-brand-400 dark:hover:text-brand-300"
          >
            Create an Account
          </Link>
        )}
      </div>
    </div>
  );
}
