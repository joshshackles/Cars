import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CARS Dispatch",
  description: "Volunteer transportation operations platform.",
  icons: {
    icon: "/brand/cars-logo.png",
    apple: "/brand/cars-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
