import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgenticPay Gateway | Razorpay Buildathon",
  description: "Autonomous Agent-to-Agent Commerce with Bounded Razorpay Checkout",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </head>
      <body className="bg-[#E4E0DA] text-[#111111] antialiased">
        {children}
      </body>
    </html>
  );
}