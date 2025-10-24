/**
 * Publisher create/edit form modal
 */
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Publisher, PublisherCreate } from "../../../types/admin";

const publisherSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name too long"),
  contact_email: z
    .string()
    .email("Invalid email format")
    .optional()
    .or(z.literal("")),
});

type PublisherFormData = z.infer<typeof publisherSchema>;

interface PublisherFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PublisherCreate) => void;
  publisher?: Publisher | null;
  isLoading?: boolean;
}

export function PublisherFormModal({
  isOpen,
  onClose,
  onSubmit,
  publisher,
  isLoading = false,
}: PublisherFormModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PublisherFormData>({
    resolver: zodResolver(publisherSchema),
    defaultValues: {
      name: "",
      contact_email: "",
    },
  });

  // Reset form when publisher changes or modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        name: publisher?.name || "",
        contact_email: publisher?.contact_email || "",
      });
    }
  }, [isOpen, publisher, reset]);

  const handleFormSubmit = (data: PublisherFormData) => {
    onSubmit({
      name: data.name,
      contact_email: data.contact_email || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">
            {publisher ? "Edit Publisher" : "Create Publisher"}
          </h2>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {/* Name field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Publisher Name *
              </label>
              <input
                {...register("name")}
                type="text"
                id="name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter publisher name"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Contact Email field */}
            <div>
              <label
                htmlFor="contact_email"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Contact Email
              </label>
              <input
                {...register("contact_email")}
                type="email"
                id="contact_email"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="publisher@example.com"
              />
              {errors.contact_email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.contact_email.message}
                </p>
              )}
            </div>

            {/* Action buttons */}
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
                {isLoading ? "Saving..." : publisher ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
