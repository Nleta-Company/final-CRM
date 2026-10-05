import React from "react";
import type { Metadata } from "next";
import AuthLayout from "@/components/auth/AuthLayout";
import SignInForm from "@/components/forms/SignInForm";

export const metadata: Metadata = {
  title: "Sign In",
  description:
    "Sign in to access your National Lift Escalator Testing Agency (NLETA) CRM portal.",
};

export default function SignInPage() {
  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in with your credentials to access your dashboard"
    >
      <SignInForm />
    </AuthLayout>
  );
}
