import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import {
  Check,
  Copy,
  Edit,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react"
import { useState } from "react"
import {
  AdminService,
  type PublisherAccountCreate,
  type PublisherAccountPublic,
  type PublisherAccountUpdate,
} from "@/client"
import { ConfirmDialog } from "@/components/Common/ConfirmDialog"
import { ErrorBoundary } from "@/components/Common/ErrorBoundary"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { PublisherLogo } from "@/components/ui/publisher-logo"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import useCustomToast from "@/hooks/useCustomToast"
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

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false)
  const [isPasswordResultDialogOpen, setIsPasswordResultDialogOpen] =
    useState(false)

  // Selected account states
  const [selectedAccount, setSelectedAccount] =
    useState<PublisherAccountPublic | null>(null)
  const [accountToDelete, setAccountToDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [accountToResetPassword, setAccountToResetPassword] = useState<{
    userId: string
    userName: string
  } | null>(null)

  // Change password dialog states
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] =
    useState(false)
  const [accountToChangePassword, setAccountToChangePassword] = useState<{
    userId: string
    userName: string
  } | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("")
  const [changePasswordError, setChangePasswordError] = useState("")

  // Password result state
  const [passwordResult, setPasswordResult] = useState<{
    passwordEmailed: boolean
    temporaryPassword: string | null
    message: string
  } | null>(null)
  const [passwordCopied, setPasswordCopied] = useState(false)

  // Form states
  const [newAccount, setNewAccount] = useState<PublisherAccountCreate>({
    dcs_publisher_id: 0,
    username: "",
    email: "",
    full_name: "",
  })
  const [editAccount, setEditAccount] = useState<PublisherAccountUpdate>({
    dcs_publisher_id: null,
    username: null,
    email: null,
    full_name: null,
    is_active: null,
  })

  // Fetch publisher USER accounts (not DCS publishers)
  const {
    data: accountsResponse,
    isLoading: isLoadingAccounts,
    error: accountsError,
  } = useQuery({
    queryKey: ["publisherAccounts"],
    queryFn: () => AdminService.listPublisherAccounts(),
  })

  // Fetch DCS publishers for dropdown
  const { data: dcsPublishers = [], isLoading: isLoadingPublishers } = useQuery(
    {
      queryKey: ["dcsPublishers"],
      queryFn: () => AdminService.listPublishers(),
    },
  )

  // Create account mutation
  const createMutation = useMutation({
    mutationFn: (data: PublisherAccountCreate) =>
      AdminService.createPublisherAccount({ requestBody: data }),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["publisherAccounts"] })
      setIsAddDialogOpen(false)
      resetNewAccountForm()

      if (response.password_emailed) {
        showSuccessToast("Account created. Password sent to email.")
      } else if (response.temporary_password) {
        setPasswordResult({
          passwordEmailed: false,
          temporaryPassword: response.temporary_password,
          message: response.message || "Account created successfully.",
        })
        setIsPasswordResultDialogOpen(true)
      } else {
        showSuccessToast("Publisher account created successfully!")
      }
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to create account. Please try again.",
      )
    },
  })

  // Update account mutation
  const updateMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      userId: string
      data: PublisherAccountUpdate
    }) => AdminService.updatePublisherAccount({ userId, requestBody: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publisherAccounts"] })
      setIsEditDialogOpen(false)
      setSelectedAccount(null)
      showSuccessToast("Publisher account updated successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to update account. Please try again.",
      )
    },
  })

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: (userId: string) =>
      AdminService.deletePublisherAccount({ userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["publisherAccounts"] })
      setAccountToDelete(null)
      showSuccessToast("Publisher account deleted successfully!")
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to delete account. Please try again.",
      )
    },
  })

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => AdminService.resetUserPassword({ userId }),
    onSuccess: (response) => {
      setPasswordResult({
        passwordEmailed: response.password_emailed,
        temporaryPassword: response.temporary_password ?? null,
        message: response.message,
      })
      setIsResetPasswordDialogOpen(false)
      setIsPasswordResultDialogOpen(true)
      queryClient.invalidateQueries({ queryKey: ["publisherAccounts"] })
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to reset password. Please try again.",
      )
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      AdminService.changePublisherPassword({
        userId,
        requestBody: { password },
      }),
    onSuccess: () => {
      setIsChangePasswordDialogOpen(false)
      setPasswordResult({
        passwordEmailed: false,
        temporaryPassword: newPassword,
        message: "Password has been changed successfully.",
      })
      setIsPasswordResultDialogOpen(true)
      setNewPassword("")
      setNewPasswordConfirm("")
      setChangePasswordError("")
      queryClient.invalidateQueries({ queryKey: ["publisherAccounts"] })
    },
    onError: (error: any) => {
      showErrorToast(
        error.body?.detail || "Failed to change password. Please try again.",
      )
    },
  })

  // Helper functions
  const resetNewAccountForm = () => {
    setNewAccount({
      dcs_publisher_id: 0,
      username: "",
      email: "",
      full_name: "",
    })
  }

  const handleOpenAddDialog = () => {
    resetNewAccountForm()
    setIsAddDialogOpen(true)
  }

  const handleCreateAccount = () => {
    if (
      !newAccount.dcs_publisher_id ||
      !newAccount.email ||
      !newAccount.full_name
    ) {
      showErrorToast("Please fill in all required fields")
      return
    }
    createMutation.mutate(newAccount)
  }

  const handleOpenEditDialog = (account: PublisherAccountPublic) => {
    setSelectedAccount(account)
    setEditAccount({
      dcs_publisher_id: account.dcs_publisher_id,
      username: account.username,
      email: account.email,
      full_name: account.full_name,
      is_active: account.is_active,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateAccount = () => {
    if (!selectedAccount) return
    updateMutation.mutate({
      userId: selectedAccount.id,
      data: editAccount,
    })
  }

  const handleOpenDeleteDialog = (account: PublisherAccountPublic) => {
    setAccountToDelete({
      id: account.id,
      name: account.full_name || account.username,
    })
    setIsDeleteDialogOpen(true)
  }

  const confirmDeleteAccount = () => {
    if (accountToDelete) {
      deleteMutation.mutate(accountToDelete.id)
    }
  }

  const handleOpenResetPasswordDialog = (account: PublisherAccountPublic) => {
    setAccountToResetPassword({
      userId: account.id,
      userName: account.full_name || account.username,
    })
    setIsResetPasswordDialogOpen(true)
  }

  const confirmResetPassword = () => {
    if (accountToResetPassword) {
      resetPasswordMutation.mutate(accountToResetPassword.userId)
    }
  }

  const handleOpenChangePasswordDialog = (account: PublisherAccountPublic) => {
    setAccountToChangePassword({
      userId: account.id,
      userName: account.full_name || account.username,
    })
    setNewPassword("")
    setNewPasswordConfirm("")
    setChangePasswordError("")
    setIsChangePasswordDialogOpen(true)
  }

  const confirmChangePassword = () => {
    if (!accountToChangePassword) return
    if (newPassword.length < 8) {
      setChangePasswordError("Password must be at least 8 characters.")
      return
    }
    if (newPassword !== newPasswordConfirm) {
      setChangePasswordError("Passwords do not match.")
      return
    }
    setChangePasswordError("")
    changePasswordMutation.mutate({
      userId: accountToChangePassword.userId,
      password: newPassword,
    })
  }

  const handleCopyPassword = async () => {
    if (passwordResult?.temporaryPassword) {
      await navigator.clipboard.writeText(passwordResult.temporaryPassword)
      setPasswordCopied(true)
      showSuccessToast("Password copied to clipboard")
      setTimeout(() => setPasswordCopied(false), 2000)
    }
  }

  const closePasswordResultDialog = () => {
    setIsPasswordResultDialogOpen(false)
    setPasswordResult(null)
    setAccountToResetPassword(null)
    setAccountToChangePassword(null)
    setPasswordCopied(false)
  }

  // Get publisher name by ID
  const getPublisherName = (publisherId: number | null): string => {
    if (!publisherId) return "N/A"
    const publisher = dcsPublishers.find((p) => p.id === publisherId)
    return publisher?.name || "Unknown"
  }

  // Filter accounts based on search query
  const accounts = accountsResponse?.data ?? []
  const filteredAccounts = accounts.filter(
    (account) =>
      account.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      account.dcs_publisher_name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()),
  )

  if (accountsError) {
    return (
      <div className="max-w-full p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded">
          Error loading publisher accounts. Please try again later.
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
            Publisher Accounts
          </h1>
          <p className="text-muted-foreground">
            Manage publisher user accounts linked to DCS
          </p>
        </div>
        <Button
          onClick={handleOpenAddDialog}
          className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Publisher Account
        </Button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or publisher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <Card className="shadow-neuro border-teal-100 dark:border-teal-900">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-500" />
            All Publisher Accounts ({filteredAccounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingAccounts ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Loading publisher accounts...
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery
                ? "No publisher accounts found matching your search"
                : "No publisher accounts yet. Add your first publisher account!"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>DCS Publisher</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAccounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{account.full_name}</div>
                        <div className="text-sm text-muted-foreground font-mono">
                          @{account.username}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Mail className="w-3 h-3" />
                        <span className="text-sm">
                          {account.email || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {account.dcs_publisher_id && (
                          <PublisherLogo
                            publisherId={account.dcs_publisher_id}
                            size="sm"
                          />
                        )}
                        <span>
                          {account.dcs_publisher_name ||
                            getPublisherName(account.dcs_publisher_id)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          account.is_active
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                        }`}
                      >
                        {account.is_active ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {account.created_at
                        ? new Date(account.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenResetPasswordDialog(account)}
                          disabled={resetPasswordMutation.isPending}
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          title="Reset Password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenChangePasswordDialog(account)}
                          disabled={changePasswordMutation.isPending}
                          className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          title="Change Password"
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditDialog(account)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="Edit Account"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDeleteDialog(account)}
                          disabled={deleteMutation.isPending}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete Account"
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

      {/* Add Account Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Publisher Account</DialogTitle>
            <DialogDescription>
              Create a user account linked to a DCS publisher
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* DCS Publisher Selector */}
            <div className="space-y-2">
              <Label htmlFor="add-dcs-publisher">
                DCS Publisher{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Select
                value={
                  newAccount.dcs_publisher_id
                    ? newAccount.dcs_publisher_id.toString()
                    : ""
                }
                onValueChange={(value) =>
                  setNewAccount({
                    ...newAccount,
                    dcs_publisher_id: parseInt(value, 10),
                  })
                }
                disabled={isLoadingPublishers}
              >
                <SelectTrigger id="add-dcs-publisher">
                  <SelectValue placeholder="Select a publisher..." />
                </SelectTrigger>
                <SelectContent>
                  {dcsPublishers.map((publisher) => (
                    <SelectItem
                      key={publisher.id}
                      value={publisher.id.toString()}
                    >
                      {publisher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="add-full-name">
                Full Name{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="add-full-name"
                placeholder="e.g., John Doe"
                value={newAccount.full_name}
                onChange={(e) => {
                  const fullName = e.target.value
                  // Auto-generate username with Turkish character support
                  const generatedUsername = generateUsername(fullName)

                  setNewAccount({
                    ...newAccount,
                    full_name: fullName,
                    username: generatedUsername,
                  })
                }}
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="add-username">
                Username{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="add-username"
                placeholder="e.g., johndoe"
                value={newAccount.username || ""}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, username: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                Auto-generated from full name (editable)
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="add-email">
                Email{" "}
                <span className="text-destructive ml-1" aria-hidden="true">
                  *
                </span>
              </Label>
              <Input
                id="add-email"
                type="email"
                placeholder="e.g., user@publisher.com"
                value={newAccount.email}
                onChange={(e) =>
                  setNewAccount({ ...newAccount, email: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddDialogOpen(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAccount}
              disabled={createMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Account Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Publisher Account</DialogTitle>
            <DialogDescription>
              Update the publisher account information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* DCS Publisher Selector */}
            <div className="space-y-2">
              <Label htmlFor="edit-dcs-publisher">DCS Publisher</Label>
              <Select
                value={
                  editAccount.dcs_publisher_id
                    ? editAccount.dcs_publisher_id.toString()
                    : ""
                }
                onValueChange={(value) =>
                  setEditAccount({
                    ...editAccount,
                    dcs_publisher_id: parseInt(value, 10),
                  })
                }
                disabled={isLoadingPublishers}
              >
                <SelectTrigger id="edit-dcs-publisher">
                  <SelectValue placeholder="Select a publisher..." />
                </SelectTrigger>
                <SelectContent>
                  {dcsPublishers.map((publisher) => (
                    <SelectItem
                      key={publisher.id}
                      value={publisher.id.toString()}
                    >
                      {publisher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Full Name</Label>
              <Input
                id="edit-full-name"
                placeholder="e.g., John Doe"
                value={editAccount.full_name || ""}
                onChange={(e) =>
                  setEditAccount({ ...editAccount, full_name: e.target.value })
                }
              />
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                placeholder="e.g., johndoe"
                value={editAccount.username || ""}
                onChange={(e) =>
                  setEditAccount({ ...editAccount, username: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                3-50 characters, alphanumeric, underscore, hyphen, or dot
              </p>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="e.g., user@publisher.com"
                value={editAccount.email || ""}
                onChange={(e) =>
                  setEditAccount({ ...editAccount, email: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={updateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateAccount}
              disabled={updateMutation.isPending}
              className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white"
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={confirmDeleteAccount}
        title="Delete Publisher Account"
        description={`Are you sure you want to delete the account for "${accountToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      {/* Reset Password Confirmation Dialog */}
      <ConfirmDialog
        open={isResetPasswordDialogOpen}
        onOpenChange={setIsResetPasswordDialogOpen}
        onConfirm={confirmResetPassword}
        title="Reset Password"
        description={`Are you sure you want to reset the password for "${accountToResetPassword?.userName}"? A new password will be generated and the user will be notified.`}
        confirmText="Reset Password"
        cancelText="Cancel"
        variant="warning"
        isLoading={resetPasswordMutation.isPending}
      />

      {/* Change Password Dialog */}
      <Dialog
        open={isChangePasswordDialogOpen}
        onOpenChange={setIsChangePasswordDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-purple-500" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for &ldquo;{accountToChangePassword?.userName}&rdquo;. The
              publisher will be required to change it on next login.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="change-password">New Password</Label>
              <PasswordInput
                id="change-password"
                placeholder="Enter new password (min 8 characters)"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setChangePasswordError("")
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="change-password-confirm">Confirm Password</Label>
              <PasswordInput
                id="change-password-confirm"
                placeholder="Confirm new password"
                value={newPasswordConfirm}
                onChange={(e) => {
                  setNewPasswordConfirm(e.target.value)
                  setChangePasswordError("")
                }}
              />
            </div>
            {changePasswordError && (
              <p className="text-sm text-destructive">{changePasswordError}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsChangePasswordDialogOpen(false)}
              disabled={changePasswordMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmChangePassword}
              disabled={changePasswordMutation.isPending}
              className="bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white"
            >
              {changePasswordMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Result Dialog */}
      <Dialog
        open={isPasswordResultDialogOpen}
        onOpenChange={closePasswordResultDialog}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-green-500" />
              Password {accountToChangePassword ? "Changed" : accountToResetPassword ? "Reset" : "Generated"}
            </DialogTitle>
            <DialogDescription>{passwordResult?.message}</DialogDescription>
          </DialogHeader>

          {passwordResult?.passwordEmailed ? (
            <div className="flex items-center gap-2 py-4 text-green-600">
              <Mail className="h-5 w-5" />
              <span>Password has been sent to the user's email address.</span>
            </div>
          ) : passwordResult?.temporaryPassword ? (
            <div className="space-y-3 py-4">
              <p className="text-amber-600">
                Email delivery is not available. Please share this password
                securely:
              </p>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <span className="font-mono text-lg flex-1">
                  {passwordResult.temporaryPassword}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyPassword}
                >
                  {passwordCopied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                The user should change this password after first login.
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button onClick={closePasswordResultDialog}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
