"use client";
import { StyledRoot } from "./StyledRoot";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>AI Assistant</title>
      </head>
      <body suppressHydrationWarning>
        <StyledRoot>{children}</StyledRoot>
      </body>
    </html>
  );
}
