import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  BookOpen,
  Check,
  ChevronsUpDown,
  Copy,
  Edit,
  Eye,
  EyeOff,
  ImagePlus,
  KeyRound,
  Mail,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { useRef, useState } from "react"
import {
  AdminService,
  OpenAPI,
  type PublisherCreateAPI,
  type PublisherPublic,
  type PublisherUpdate,
} from "@/client"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"
import { cn } from "@/lib/utils"
import { generateUsername } from "@/utils/usernameGenerator"

export const Route = createFileRoute("/_layout/admin/publishers")({
  component: () => (
    <ErrorBoundary>
      <AdminPublishers />
    </ErrorBoundary>
  ),
})

function AdminPublishers() {
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedPublisher, setSelectedPublisher] =
    useState<PublisherPublic | null>(null)
  const [publisherToDelete, setPublisherToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false)
  const [isPasswordResultDialogOpen, setIsPasswordResultDialogOpen] =
    useState(false)
  const [publisherToResetPassword, setPublisherToResetPassword] = useState<{
    userId: string
    userName: string
  } | null>(null)
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)
  const [publisherNameOpen, setPublisherNameOpen] = useState(false)
  const [newPublisher, setNewPublisher] = useState<PublisherCreateAPI>({
    name: "",
    contact_email: "",
    username: "",
    user_email: "",
    full_name: "",
  })
  const [editPublisher, setEditPublisher] = useState<PublisherUpdate>({
    name: "",
    contact_email: "",
    user_email: "",
    user_username: "",
    user_full_name: "",
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Track which passwords are revealed (Eye icon state)
  const [revealedPasswords, setRevealedPasswords] = useState<
    Record<string, boolean>
  >({})

  // Fetch publishers from API
  const {
    data: publishers = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["publishers"],
    queryFn: () => AdminService.listPublishers(),
  })

  // Create publisher mutation
  const createPublisherMutation = useMutation({
    mutationFn: (data: PublisherCreateAPI) =>
      AdminService.createPublisher({ requestBody: data }),
    onSuccess: (_response) => {
      queryClient.invalidateQueries({ queryKey: ["publishers"] })
      setIsAddDialogOpen(false)
      setNewPublisher({
        name: "",
        contact_email: "",
        username: "",
        user_email: "",
        full_name: "",
      })

      showSuccessToast(
        "Publisher created successfully! Password visible in table.",
      )
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to create publisher. Please try again.",
      )
    },
  })

  // Update publisher mutation
  const updatePublisherMutation = useMutation({
    mutationFn: ({
      publisherId,
      data,
    }: {
      publisherId: string
      data: PublisherUpdate
    }) => AdminService.updatePublisher({ publisherId, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishers"] })
      setIsEditDialogOpen(false)
      setSelectedPublisher(null)
      showSuccessToast("Publisher updated successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to update publisher. Please try again.",
      )
    },
  })

  // Delete publisher mutation
  const deletePublisherMutation = useMutation({
    mutationFn: (publisherId: string) =>
      AdminService.deletePublisher({ publisherId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishers"] })
      showSuccessToast("Publisher deleted successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to delete publisher. Please try again.",
      )
    },
  })

  // Reset password mutation [Story 9.2]
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => AdminService.resetUserPassword({ userId }),
    onSuccess: (response) => {
      setNewPassword(response.new_password)
      setIsResetPasswordDialogOpen(false)
      setIsPasswordResultDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ["publishers"] })
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to reset password. Please try again.",
      )
    },
  })

  // Logo upload mutation [Story 9.2]
  const uploadLogoMutation = useMutation({
    mutationFn: ({ publisherId, file }: { publisherId: string; file: File }) =>
      AdminService.uploadPublisherLogo({
        publisherId,
        formData: { file },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishers"] })
      setLogoFile(null)
      setLogoPreview(null)
      showSuccessToast("Logo uploaded successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to upload logo. Please try again.",
      )
    },
  })

  // Delete logo mutation [Story 9.2]
  const deleteLogoMutation = useMutation({
    mutationFn: (publisherId: string) =>
      AdminService.deletePublisherLogo({ publisherId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publishers"] })
      showSuccessToast("Logo removed successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to remove logo. Please try again.",
      )
    },
  })

  const handleAddPublisher = () => {
    if (
      !newPublisher.name ||
      !newPublisher.contact_email ||
      !newPublisher.username ||
      !newPublisher.user_email ||
      !newPublisher.full_name
    ) {
      showErrorToast("Please fill in all required fields")
      return
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_.-]{3,50}$/.test(newPublisher.username)) {
      showErrorToast(
        "Username must be 3-50 characters, alphanumeric, underscore, hyphen, or dot",
      )
      return
    }

    createPublisherMutation.mutate(newPublisher)
  }

  const handleEditPublisher = (publisher: PublisherPublic) => {
    setSelectedPublisher(publisher)
    setEditPublisher({
      name: publisher.name,
      contact_email: publisher.contact_email || "",
      user_email: publisher.user_email,
      user_username: publisher.user_username || "",
      user_full_name: publisher.user_full_name,
    })
    // Clear any previous logo selection
    setLogoFile(null)
    setLogoPreview(null)
    setIsEditDialogOpen(true)
  }

  const handleUpdatePublisher = () => {
    if (!selectedPublisher) return
    if (
      !editPublisher.name ||
      !editPublisher.contact_email ||
      !editPublisher.user_email ||
      !editPublisher.user_full_name
    ) {
      showErrorToast("Please fill in all required fields")
      return
    }
    updatePublisherMutation.mutate({
      publisherId: selectedPublisher.id,
      data: editPublisher,
    })
  }

  const handleDeletePublisher = (publisherId: string, name: string) => {
    setPublisherToDelete({ id: publisherId, name })
    setIsDeleteDialogOpen(true)
  }

  const confirmDeletePublisher = () => {
    if (publisherToDelete) {
      deletePublisherMutation.mutate(publisherToDelete.id)
      setPublisherToDelete(null)
    }
  }

  // Password reset handlers [Story 9.2]
  const handleResetPassword = (userId: string, userName: string) => {
    setPublisherToResetPassword({ userId, userName })
    setIsResetPasswordDialogOpen(true)
  }

  const confirmResetPassword = () => {
    if (publisherToResetPassword) {
      resetPasswordMutation.mutate(publisherToResetPassword.userId)
    }
  }

  const handleCopyPassword = async () => {
    if (newPassword) {
      await navigator.clipboard.writeText(newPassword)
      setPasswordCopied(true)
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  const closePasswordResultDialog = () => {
    setIsPasswordResultDialogOpen(false)
    setNewPassword(null)
    setPublisherToResetPassword(null)
    setPasswordCopied(false)
  }

  // Logo handlers [Story 9.2]
  const handleLogoFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        showErrorToast("Please select an image file (jpg, png, etc.)")
        return
      }
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        showErrorToast("File size must be less than 2MB")
        return
      }
      setLogoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleLogoUpload = (publisherId: string) => {
    if (logoFile) {
      uploadLogoMutation.mutate({ publisherId, file: logoFile })
    }
  }

  const handleLogoDelete = (publisherId: string) => {
    deleteLogoMutation.mutate(publisherId)
  }

  const clearLogoSelection = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (logoInputRef.current) {
      logoInputRef.current.value = ""
    }
  }

  // Get publisher initials for placeholder
  const getPublisherInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const filteredPublishers = publishers.filter(
    (publisher) =>
      publisher.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      publisher.contact_email
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      ((publisher as any).user_username
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ??
        false) ||
      publisher.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      publisher.user_full_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )

  if (error) {
    return (
      <div className="max-w-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
          Error loading publishers. Please try again later.
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-full p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Publishers
          </h1>
          <p className="text-muted-foreground">
            Manage content publishers in the system
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white shadow-neuro-sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Publisher
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search publishers by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Publishers Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-teal-500" />
            All Publishers ({filteredPublishers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading publishers...
            </div>
          ) : filteredPublishers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No publishers found matching your search"
                : "No publishers yet. Add your first publisher!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Logo</TableHead>
                  <TableHead>Publisher Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>User Full Name</TableHead>
                  <TableHead>User Email</TableHead>
                  <TableHead>Contact Email</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPublishers.map((publisher) => (
                  <TableRow key={publisher.id}>
                    <TableCell>
                      {publisher.logo_url ? (
                        <img
                          src={`${OpenAPI.BASE}${publisher.logo_url}`}
                          alt={`${publisher.name} logo`}
                          className="w-10 h-10 rounded-full object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold text-sm">
                          {getPublisherInitials(publisher.name)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {publisher.name}
                    </TableCell>
                    <TableCell className="text-sm font-mono">
                      {(publisher as any).user_username || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {publisher.user_full_name || "N/A"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="text-sm">
                          {publisher.user_email || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {publisher.contact_email || "N/A"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(publisher.created_at).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )}
                    </TableCell>
                    <TableCell>
                      {(publisher as any).user_initial_password ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm">
                            {revealedPasswords[publisher.user_id]
                              ? (publisher as any).user_initial_password
                              : "••••••••••••"}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setRevealedPasswords((prev) => ({
                                ...prev,
                                [publisher.user_id]: !prev[publisher.user_id],
                              }))
                            }
                            className="h-7 w-7 p-0"
                          >
                            {revealedPasswords[publisher.user_id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          N/A
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleResetPassword(
                              publisher.user_id,
                              publisher.user_full_name || publisher.name,
                            )
                          }
                          disabled={resetPasswordMutation.isPending}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPublisher(publisher)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeletePublisher(publisher.id, publisher.name)
                          }
                          disabled={deletePublisherMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Publisher Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Publisher</DialogTitle>
            <DialogDescription>
              Create a new publisher account in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="publisher-name">Publisher Name *</Label>
              <Popover
                open={publisherNameOpen}
                onOpenChange={setPublisherNameOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={publisherNameOpen}
                    className="w-full justify-between font-normal"
                  >
                    {newPublisher.name || "Select or enter publisher name..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Search or enter new publisher..."
                      value={newPublisher.name}
                      onValueChange={(value) =>
                        setNewPublisher({ ...newPublisher, name: value })
                      }
                    />
                    <CommandList>
                      <CommandEmpty>
                        <div className="py-2 px-2 text-sm">
                          <span className="text-muted-foreground">
                            No existing publisher found.
                          </span>
                          {newPublisher.name && (
                            <div className="mt-1">
                              Press enter or click to create:{" "}
                              <span className="font-medium text-foreground">
                                "{newPublisher.name}"
                              </span>
                            </div>
                          )}
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Existing Publishers">
                        {/* Get unique publisher names */}
                        {Array.from(new Set(publishers.map((p) => p.name)))
                          .filter((name) =>
                            name
                              .toLowerCase()
                              .includes(
                                (newPublisher.name || "").toLowerCase(),
                              ),
                          )
                          .map((name) => (
                            <CommandItem
                              key={name}
                              value={name}
                              onSelect={(currentValue) => {
                                setNewPublisher({
                                  ...newPublisher,
                                  name: currentValue,
                                })
                                setPublisherNameOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  newPublisher.name === name
                                    ? "opacity-100"
                                    : "opacity-0",
                                )}
                              />
                              {name}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                Select an existing publisher or enter a new name
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="full-name">Full Name *</Label>
              <Input
                id="full-name"
                placeholder="e.g., John Doe"
                value={newPublisher.full_name}
                onChange={(e) => {
                  const fullName = e.target.value
                  // Auto-generate username with Turkish character support
                  const generatedUsername = generateUsername(fullName)

                  setNewPublisher({
                    ...newPublisher,
                    full_name: fullName,
                    username: generatedUsername,
                  })
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                placeholder="e.g., johndoe"
                value={newPublisher.username}
                onChange={(e) =>
                  setNewPublisher({
                    ...newPublisher,
                    username: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from full name (editable)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">User Email *</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="user@example.com"
                value={newPublisher.user_email}
                onChange={(e) =>
                  setNewPublisher({
                    ...newPublisher,
                    user_email: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Contact Email *</Label>
              <Input
                id="contact-email"
                type="email"
                placeholder="contact@example.com"
                value={newPublisher.contact_email}
                onChange={(e) =>
                  setNewPublisher({
                    ...newPublisher,
                    contact_email: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={createPublisherMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddPublisher}
              disabled={createPublisherMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {createPublisherMutation.isPending
                ? "Creating..."
                : "Create Publisher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Publisher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Publisher</DialogTitle>
            <DialogDescription>
              Update the publisher and user information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Logo Upload Section [Story 9.2] */}
            <div className="space-y-2">
              <Label>Publisher Logo</Label>
              <div className="flex items-center gap-4">
                {/* Current logo or preview */}
                <div className="relative">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-16 h-16 rounded-full object-cover border"
                    />
                  ) : selectedPublisher?.logo_url ? (
                    <img
                      src={`${OpenAPI.BASE}${selectedPublisher.logo_url}`}
                      alt={`${selectedPublisher.name} logo`}
                      className="w-16 h-16 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-semibold">
                      {selectedPublisher
                        ? getPublisherInitials(selectedPublisher.name)
                        : "?"}
                    </div>
                  )}
                  {logoPreview && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearLogoSelection}
                      className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200"
                    >
                      <X className="w-3 h-3 text-red-600" />
                    </Button>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileSelect}
                    className="hidden"
                    id="logo-upload"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadLogoMutation.isPending}
                    >
                      <ImagePlus className="w-4 h-4 mr-1" />
                      {logoPreview ? "Change" : "Select"}
                    </Button>
                    {logoFile && selectedPublisher && (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleLogoUpload(selectedPublisher.id)}
                        disabled={uploadLogoMutation.isPending}
                        className="bg-teal-500 hover:bg-teal-600"
                      >
                        <Upload className="w-4 h-4 mr-1" />
                        {uploadLogoMutation.isPending
                          ? "Uploading..."
                          : "Upload"}
                      </Button>
                    )}
                    {selectedPublisher?.logo_url && !logoPreview && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleLogoDelete(selectedPublisher.id)}
                        disabled={deleteLogoMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    JPG or PNG, max 2MB
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-publisher-name">Publisher Name *</Label>
              <Input
                id="edit-publisher-name"
                placeholder="e.g., ABC Publishing"
                value={editPublisher.name || ""}
                onChange={(e) =>
                  setEditPublisher({ ...editPublisher, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-contact-email">Contact Email *</Label>
              <Input
                id="edit-contact-email"
                type="email"
                placeholder="e.g., contact@publisher.com"
                value={editPublisher.contact_email || ""}
                onChange={(e) =>
                  setEditPublisher({
                    ...editPublisher,
                    contact_email: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-full-name">User Full Name *</Label>
              <Input
                id="edit-user-full-name"
                placeholder="e.g., John Doe"
                value={editPublisher.user_full_name || ""}
                onChange={(e) =>
                  setEditPublisher({
                    ...editPublisher,
                    user_full_name: e.target.value,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-username">Username *</Label>
              <Input
                id="edit-user-username"
                placeholder="e.g., johndoe"
                value={editPublisher.user_username || ""}
                onChange={(e) =>
                  setEditPublisher({
                    ...editPublisher,
                    user_username: e.target.value,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                3-50 characters, alphanumeric, underscore, hyphen, or dot
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-user-email">User Email *</Label>
              <Input
                id="edit-user-email"
                type="email"
                placeholder="e.g., user@publisher.com"
                value={editPublisher.user_email || ""}
                onChange={(e) =>
                  setEditPublisher({
                    ...editPublisher,
                    user_email: e.target.value,
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updatePublisherMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePublisher}
              disabled={updatePublisherMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {updatePublisherMutation.isPending
                ? "Updating..."
                : "Update Publisher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeletePublisher}
        title="Delete Publisher"
        description={`Are you sure you want to delete "${publisherToDelete?.name}"? This action cannot be undone and will remove all associated data.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deletePublisherMutation.isPending}
      />

      {/* Reset Password Confirmation Dialog [Story 9.2] */}
      <ConfirmDialog
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        onConfirm={confirmResetPassword}
        title="Reset Password"
        description={`Are you sure you want to reset the password for "${publisherToResetPassword?.userName}"? A new password will be generated and the user will be notified.`}
        confirmText="Reset Password"
        cancelText="Cancel"
        variant="warning"
        isLoading={resetPasswordMutation.isPending}
      />

      {/* New Password Display Dialog [Story 9.2] */}
      <Dialog
        open={isPasswordResultDialogOpen}
        onOpenChange={closePasswordResultDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-green-500" />
              Password Reset Successful
            </DialogTitle>
            <DialogDescription>
              The password for {publisherToResetPassword?.userName} has been
              reset. Please share this password securely with the user.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-sm text-muted-foreground mb-2 block">
              New Password
            </Label>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-muted rounded-md font-mono text-sm select-all">
                {newPassword}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPassword}
                className="flex items-center gap-1"
              >
                {passwordCopied ? (
                  <>
                    <Check className="w-4 h-4 text-green-500" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              This password is displayed only once. Make sure to copy it before
              closing this dialog.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={closePasswordResultDialog}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
