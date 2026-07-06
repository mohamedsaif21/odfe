import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function CustomerDisplayPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Customer Display" />
      </PageContainer>
    </AdminLayout>
  );
}