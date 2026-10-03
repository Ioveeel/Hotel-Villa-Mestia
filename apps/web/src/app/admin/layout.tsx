import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { template: "%s · Villa Mestia Admin", default: "Villa Mestia Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return children;
}
