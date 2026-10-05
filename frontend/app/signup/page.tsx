import React from "react";
import type { Metadata } from "next";
import AuthLayout from "@/components/auth/AuthLayout";
import SignUpForm from "@/components/forms/SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up",
  description:
    "Create an account on the National Lift Escalator Testing Agency (NLETA) CRM data management platform.",
};

export default function SignUpPage() {
  return (
    <AuthLayout
      title="Create an Account"
      subtitle="Register below to start managing lift & escalator data"
    >
      <SignUpForm />
    </AuthLayout>
  );
}
