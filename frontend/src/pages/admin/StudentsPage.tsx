/**
 * Students read-only list page
 */
import { useState } from "react";
import { DataTable, type Column } from "../../components/common/DataTable";
import { useStudents } from "../../features/admin/hooks/useStudents";
import type { Student } from "../../types/admin";

export function StudentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useStudents({ page, per_page: 20, search });

  const columns: Column<Student>[] = [
    {
      header: "Email",
      accessor: "email",
      sortable: true,
    },
    {
      header: "Grade Level",
      accessor: (row) => row.grade_level || "-",
    },
    {
      header: "Parent Email",
      accessor: (row) => row.parent_email || "-",
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
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <p className="text-gray-600 mt-1">View all students in the system</p>
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        pagination={data?.pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        emptyMessage="No students found"
      />
    </div>
  );
}
