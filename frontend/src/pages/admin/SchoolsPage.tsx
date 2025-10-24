/**
 * Schools management page
 */
import { useState } from "react";
import { DataTable, type Column } from "../../components/common/DataTable";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { SchoolFormModal } from "../../features/admin/components/SchoolFormModal";
import {
  useCreateSchool,
  useDeleteSchool,
  useSchools,
  useUpdateSchool,
} from "../../features/admin/hooks/useSchools";
import type { School, SchoolCreate } from "../../types/admin";

export function SchoolsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [deletingSchool, setDeletingSchool] = useState<School | null>(null);

  // Queries and mutations
  const { data, isLoading } = useSchools({ page, per_page: 20, search });
  const createMutation = useCreateSchool();
  const updateMutation = useUpdateSchool();
  const deleteMutation = useDeleteSchool();

  // Handlers
  const handleCreate = async (formData: SchoolCreate) => {
    try {
      await createMutation.mutateAsync(formData);
      setIsCreateModalOpen(false);
      alert("School created successfully");
    } catch {
      alert("Failed to create school");
    }
  };

  const handleUpdate = async (formData: SchoolCreate) => {
    if (!editingSchool) return;

    try {
      await updateMutation.mutateAsync({
        id: editingSchool.id,
        data: formData,
      });
      setEditingSchool(null);
      alert("School updated successfully");
    } catch {
      alert("Failed to update school");
    }
  };

  const handleDelete = async () => {
    if (!deletingSchool) return;

    try {
      await deleteMutation.mutateAsync(deletingSchool.id);
      setDeletingSchool(null);
      alert("School deleted successfully");
    } catch {
      alert("Failed to delete school");
    }
  };

  // Table columns
  const columns: Column<School>[] = [
    {
      header: "School Name",
      accessor: "name",
      sortable: true,
    },
    {
      header: "Publisher",
      accessor: "publisher_name",
      sortable: true,
    },
    {
      header: "Address",
      accessor: (row) => row.address || "-",
    },
    {
      header: "Contact Info",
      accessor: (row) => row.contact_info || "-",
    },
    {
      header: "Created",
      accessor: (row) => new Date(row.created_at).toLocaleDateString(),
      sortable: true,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Schools</h1>
          <p className="text-gray-600 mt-1">Manage educational institutions</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <span>+</span>
          Create School
        </button>
      </div>

      <DataTable
        data={data?.data || []}
        columns={columns}
        pagination={data?.pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        emptyMessage="No schools found"
        actions={(row) => (
          <div className="flex gap-2">
            <button
              onClick={() => setEditingSchool(row)}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => setDeletingSchool(row)}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Delete
            </button>
          </div>
        )}
      />

      <SchoolFormModal
        isOpen={isCreateModalOpen || !!editingSchool}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingSchool(null);
        }}
        onSubmit={editingSchool ? handleUpdate : handleCreate}
        school={editingSchool}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      <ConfirmDialog
        isOpen={!!deletingSchool}
        title="Delete School"
        message={`Are you sure you want to delete "${deletingSchool?.name}"? This will affect all associated teachers and students.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeletingSchool(null)}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
