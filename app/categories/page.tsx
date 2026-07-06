import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function CategoriesPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Categories" />
      </PageContainer>
    </AdminLayout>
  );
}