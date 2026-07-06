import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function BrewBarPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Brew Bar" />
      </PageContainer>
    </AdminLayout>
  );
}