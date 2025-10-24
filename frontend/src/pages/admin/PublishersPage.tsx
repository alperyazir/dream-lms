/**
 * Publishers management page
 */
import { useState } from "react";
import { DataTable, type Column } from "../../components/common/DataTable";
import { ConfirmDialog } from "../../components/common/ConfirmDialog";
import { PublisherFormModal } from "../../features/admin/components/PublisherFormModal";
import {
  useCreatePublisher,
  useDeletePublisher,
  usePublishers,
  useUpdatePublisher,
} from "../../features/admin/hooks/usePublishers";
import type { Publisher, PublisherCreate } from "../../types/admin";

export function PublishersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPublisher, setEditingPublisher] = useState<Publisher | null>(
    null,
  );
  const [deletingPublisher, setDeletingPublisher] = useState<Publisher | null>(
    null,
  );

  // Queries and mutations
  const { data, isLoading } = usePublishers({ page, per_page: 20, search });
  const createMutation = useCreatePublisher();
  const updateMutation = useUpdatePublisher();
  const deleteMutation = useDeletePublisher();

  // Handlers
  const handleCreate = async (formData: PublisherCreate) => {
    try {
      const result = await createMutation.mutateAsync(formData);
      setIsCreateModalOpen(false);
      // Show success toast (you'd implement toast notifications)
      alert(`Publisher created! Temporary password: ${result.temp_password}`);
    } catch {
      alert("Failed to create publisher");
    }
  };

  const handleUpdate = async (formData: PublisherCreate) => {
    if (!editingPublisher) return;

    try {
      await updateMutation.mutateAsync({
        id: editingPublisher.id,
        data: formData,
      });
      setEditingPublisher(null);
      alert("Publisher updated successfully");
    } catch {
      alert("Failed to update publisher");
    }
  };

  const handleDelete = async () => {
    if (!deletingPublisher) return;

    try {
      await deleteMutation.mutateAsync(deletingPublisher.id);
      setDeletingPublisher(null);
      alert("Publisher deleted successfully");
    } catch {
      alert("Failed to delete publisher");
    }
  };

  // Table columns
  const columns: Column<Publisher>[] = [
    {
      header: "Name",
      accessor: "name",
      sortable: true,
    },
    {
      header: "Contact Email",
      accessor: "contact_email",
      sortable: true,
    },
    {
      header: "User Email",
      accessor: "email",
      sortable: true,
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
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Publishers</h1>
          <p className="text-gray-600 mt-1">
            Manage content publishers and their accounts
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
        >
          <span>+</span>
          Create Publisher
        </button>
      </div>

      {/* Table */}
      <DataTable
        data={data?.data || []}
        columns={columns}
        pagination={data?.pagination}
        onPageChange={setPage}
        onSearch={setSearch}
        isLoading={isLoading}
        emptyMessage="No publishers found"
        actions={(row) => (
          <div className="flex gap-2">
            <button
              onClick={() => setEditingPublisher(row)}
              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Edit
            </button>
            <button
              onClick={() => setDeletingPublisher(row)}
              className="px-3 py-1 text-sm text-red-600 hover:text-red-800 font-medium"
            >
              Delete
            </button>
          </div>
        )}
      />

      {/* Create/Edit Modal */}
      <PublisherFormModal
        isOpen={isCreateModalOpen || !!editingPublisher}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPublisher(null);
        }}
        onSubmit={editingPublisher ? handleUpdate : handleCreate}
        publisher={editingPublisher}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingPublisher}
        title="Delete Publisher"
        message={`Are you sure you want to delete "${deletingPublisher?.name}"? This action cannot be undone and will affect all associated schools and users.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeletingPublisher(null)}
        isLoading={deleteMutation.isPending}
        variant="danger"
      />
    </div>
  );
}
