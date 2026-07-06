import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function EmployeesPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Employees" />
      </PageContainer>
    </AdminLayout>
  );
}