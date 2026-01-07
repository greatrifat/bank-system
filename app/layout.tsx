import type { Metadata } from "next";

import "./globals.css";



export const metadata: Metadata = {
  title: "Alokito Agro",
  description: "Alokito Poribesh Foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html>
      <body
      >
        {children}
      </body>
    </html>
  );
}
