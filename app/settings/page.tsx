import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function SettingsPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Settings" />
      </PageContainer>
    </AdminLayout>
  );
}