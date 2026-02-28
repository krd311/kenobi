import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Stargazing Condition Evaluator",
  description: "Check tonight's stargazing conditions at any location.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
