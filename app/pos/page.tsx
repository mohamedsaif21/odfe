import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function PosPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Point of Sale" />
      </PageContainer>
    </AdminLayout>
  );
}