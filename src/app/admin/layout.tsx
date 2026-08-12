import { LogoutButton } from "@/components/admin/logout-button";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-[1800px] px-4 py-8 sm:px-8 lg:px-12">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Console</h1>
        </div>
        <LogoutButton />
      </div>

      <AdminNav />

      {children}
    </div>
  );
}
