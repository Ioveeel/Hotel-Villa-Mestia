import { AdminSidebar } from "@/components/admin/admin-sidebar";

// Admin shell, separate from the public site (no public header/footer).
// Auth is checked in each page (requireAdmin), since layouts don't re-run on navigation.
export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
