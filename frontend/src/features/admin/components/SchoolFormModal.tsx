/**
 * School create/edit form modal
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { School, SchoolCreate } from "../../../types/admin";
import { usePublishers } from "../hooks/usePublishers";

const schoolSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  publisher_id: z.string().uuid("Publisher is required"),
  address: z.string().max(500, "Address too long").optional().or(z.literal("")),
  contact_info: z
    .string()
    .max(500, "Contact info too long")
    .optional()
    .or(z.literal("")),
});

type SchoolFormData = z.infer<typeof schoolSchema>;

interface SchoolFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: SchoolCreate) => void;
  school?: School | null;
  isLoading?: boolean;
}

export function SchoolFormModal({
  isOpen,
  onClose,
  onSubmit,
  school,
  isLoading = false,
}: SchoolFormModalProps) {
  const { data: publishersData } = usePublishers({ per_page: 100 });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SchoolFormData>({
    resolver: zodResolver(schoolSchema),
    defaultValues: {
      name: "",
      publisher_id: "",
      address: "",
      contact_info: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: school?.name || "",
        publisher_id: school?.publisher_id || "",
        address: school?.address || "",
        contact_info: school?.contact_info || "",
      });
    }
  }, [isOpen, school, reset]);

  const handleFormSubmit = (data: SchoolFormData) => {
    onSubmit({
      name: data.name,
      publisher_id: data.publisher_id,
      address: data.address || undefined,
      contact_info: data.contact_info || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {school ? "Edit School" : "Create School"}
          </h2>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Name */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                School Name *
              </label>
              <input
                {...register("name")}
                type="text"
                id="name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter school name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Publisher Dropdown */}
            <div>
              <label
                htmlFor="publisher_id"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Publisher *
              </label>
              <select
                {...register("publisher_id")}
                id="publisher_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a publisher</option>
                {publishersData?.data.map((publisher) => (
                  <option key={publisher.id} value={publisher.id}>
                    {publisher.name}
                  </option>
                ))}
              </select>
              {errors.publisher_id && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.publisher_id.message}
                </p>
              )}
            </div>

            {/* Address */}
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Address
              </label>
              <textarea
                {...register("address")}
                id="address"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter school address"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.address.message}
                </p>
              )}
            </div>

            {/* Contact Info */}
            <div>
              <label
                htmlFor="contact_info"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact Info
              </label>
              <textarea
                {...register("contact_info")}
                id="contact_info"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email, phone, etc."
              />
              {errors.contact_info && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.contact_info.message}
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? "Saving..." : school ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
