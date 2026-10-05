import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "National Lift Escalator Testing Agency",
    template: "%s | National Lift Escalator Testing Agency",
  },
  description:
    "National Lift Escalator Testing Agency (NLETA) - Inspection, Certification, Safety Compliance, and Lift & Escalator CRM Data Management Platform.",
  icons: {
    icon: "/images/logo/nleta-logo.png",
    shortcut: "/images/logo/nleta-logo.png",
    apple: "/images/logo/nleta-logo.png",
  },
  openGraph: {
    title: "National Lift Escalator Testing Agency",
    description:
      "National Lift Escalator Testing Agency (NLETA) - Inspection, Certification, and CRM Data Management Platform.",
    images: [{ url: "/images/logo/nleta-logo.png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/images/logo/nleta-logo.png" type="image/png" sizes="any" />
        <link rel="shortcut icon" href="/images/logo/nleta-logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/logo/nleta-logo.png" />
      </head>
      <body className="min-h-full flex flex-col font-outfit bg-gray-50 text-gray-800 dark:bg-black dark:text-gray-200">
        {children}
      </body>
    </html>
  );
}
