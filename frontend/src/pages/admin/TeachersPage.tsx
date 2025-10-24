/**
 * Teachers read-only list page
 */
import { useState } from "react";
import { DataTable, type Column } from "../../components/common/DataTable";
import { useTeachers } from "../../features/admin/hooks/useTeachers";
import type { Teacher } from "../../types/admin";

export function TeachersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useTeachers({ page, per_page: 20, search });

  const columns: Column<Teacher>[] = [
    {
      header: "Email",
      accessor: "email",
      sortable: true,
    },
    {
      header: "School",
      accessor: "school_name",
      sortable: true,
    },
    {
      header: "Publisher",
      accessor: "publisher_name",
      sortable: true,
    },
    {
      header: "Subject",
      accessor: (row) => row.subject_specialization || "-",
    },
    {
      header: "Status",
      accessor: (row) => (
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${
            row.is_active
              ? "bg-green-100 text-green-800"
              : "bg-gray-100 text-gray-800"
          }`}
        >
          {row.is_active ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      header: "Created",
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Teachers</h1>
        <p className="text-gray-600 mt-1">View all teachers in the system</p>
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        pagination={data?.pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        emptyMessage="No teachers found"
      />
    </div>
  );
}
