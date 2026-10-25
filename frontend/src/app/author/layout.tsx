import { AppShell } from "@/components/layout/AppShell";
import { RoleGuard } from "@/components/layout/RoleGuard";

export default function AuthorLayout({ children }: LayoutProps<"/author">) {
  return (
    <RoleGuard role="author">
      <AppShell>{children}</AppShell>
    </RoleGuard>
  );
}
