/**
 * UserPasswordModal — View and set password for any user.
 * Used by admin/supervisor to manage credentials for all roles.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { useState } from "react";
import { OpenAPI } from "@/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import useCustomToast from "@/hooks/useCustomToast";

const BASE_URL = OpenAPI.BASE || "";

async function getAuthToken(): Promise<string> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as never)
      : OpenAPI.TOKEN;
  return token ?? "";
}

interface UserPasswordResponse {
  user_id: string;
  username: string;
  full_name: string | null;
  role: string;
  password: string | null;
  message: string | null;
}

async function getUserPassword(
  userId: string,
): Promise<UserPasswordResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${BASE_URL}/api/v1/admin/users/${userId}/password`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch password");
  return res.json();
}

async function setUserPassword(
  userId: string,
  password: string,
): Promise<UserPasswordResponse> {
  const token = await getAuthToken();
  const res = await fetch(`${BASE_URL}/api/v1/admin/users/${userId}/password`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("Failed to set password");
  return res.json();
}

interface UserPasswordModalProps {
  userId: string;
  userName: string;
  userRole?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserPasswordModal({
  userId,
  userName,
  userRole,
  isOpen,
  onClose,
}: UserPasswordModalProps) {
  const queryClient = useQueryClient();
  const { showSuccessToast, showErrorToast } = useCustomToast();

  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [usernameCopied, setUsernameCopied] = useState(false);
  const [passwordCopied, setPasswordCopied] = useState(false);

  const {
    data: passwordData,
    isLoading,
    error,
    refetch,
  } = useQuery<UserPasswordResponse>({
    queryKey: ["userPassword", userId],
    queryFn: () => getUserPassword(userId),
    enabled: isOpen && !!userId,
    retry: false,
  });

  const setPasswordMutation = useMutation({
    mutationFn: (password: string) => setUserPassword(userId, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userPassword", userId] });
      setNewPassword("");
      showSuccessToast("Password updated successfully!");
      refetch();
    },
    onError: () => {
      showErrorToast("Failed to update password. Please try again.");
    },
  });

  const handleCopyUsername = async () => {
    if (passwordData?.username) {
      await navigator.clipboard.writeText(passwordData.username);
      setUsernameCopied(true);
      showSuccessToast("Username copied");
      setTimeout(() => setUsernameCopied(false), 2000);
    }
  };

  const handleCopyPassword = async () => {
    if (passwordData?.password) {
      await navigator.clipboard.writeText(passwordData.password);
      setPasswordCopied(true);
      showSuccessToast("Password copied");
      setTimeout(() => setPasswordCopied(false), 2000);
    }
  };

  const generateRandomPassword = () => {
    const chars = "abcdefghijkmnpqrstuvwxyz23456789";
    let pwd = "";
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  const handleGeneratePassword = () => {
    const generated = generateRandomPassword();
    setPasswordMutation.mutate(generated);
  };

  const handleSetPassword = () => {
    if (!newPassword) return;
    if (newPassword.length > 50) {
      showErrorToast("Password must be 50 characters or less");
      return;
    }
    setPasswordMutation.mutate(newPassword);
  };

  const handleClose = () => {
    setNewPassword("");
    setShowPassword(false);
    setShowNewPassword(false);
    onClose();
  };

  const roleLabel = userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1)
    : "User";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-amber-500" />
            {roleLabel} Credentials
          </DialogTitle>
          <DialogDescription>
            View and manage login credentials for {userName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Current Credentials
            </h4>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-sm text-destructive">
                Failed to load credentials.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Username
                  </Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted/50 rounded-md px-3 py-2 font-mono text-sm">
                      {passwordData?.username || "—"}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyUsername}
                      disabled={!passwordData?.username}
                    >
                      {usernameCopied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Password
                  </Label>
                  {passwordData?.password ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-muted/50 rounded-md px-3 py-2 font-mono text-sm">
                        {showPassword ? passwordData.password : "••••••••"}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyPassword}
                      >
                        {passwordCopied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                        Password not stored yet.
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGeneratePassword}
                        disabled={setPasswordMutation.isPending}
                        className="w-full"
                      >
                        {setPasswordMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Generate New Password
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">
              Set New Password
            </h4>
            <div className="space-y-2">
              <Label
                htmlFor="new-password"
                className="text-xs text-muted-foreground"
              >
                New Password
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSetPassword}
                  disabled={!newPassword || setPasswordMutation.isPending}
                >
                  {setPasswordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
