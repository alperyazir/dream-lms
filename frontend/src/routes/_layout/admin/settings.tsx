import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { PageContainer, PageHeader } from "@/components/Common/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import useAuth from "@/hooks/useAuth";

export const Route = createFileRoute("/_layout/admin/settings")({
  component: AdminSettings,
});

const PROVIDERS = [
  { value: "deepseek", label: "DeepSeek" },
  { value: "gemini", label: "Google Gemini" },
];

const DEEPSEEK_MODELS = [
  { value: "deepseek-chat", label: "DeepSeek Chat" },
  { value: "deepseek-coder", label: "DeepSeek Coder" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner" },
];

const GEMINI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

async function fetchLLMSettings(token: string): Promise<Record<string, string>> {
  const res = await fetch("/api/v1/admin/llm-settings", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch LLM settings");
  return res.json();
}

async function updateLLMSettings(
  token: string,
  settings: Record<string, string>
): Promise<Record<string, string>> {
  const res = await fetch("/api/v1/admin/llm-settings", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error("Failed to update LLM settings");
  return res.json();
}

function AdminSettings() {
  const { accessToken } = useAuth();
  const queryClient = useQueryClient();
  const token = accessToken ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["llm-settings"],
    queryFn: () => fetchLLMSettings(token),
    enabled: !!token,
  });

  const [primary, setPrimary] = useState("");
  const [fallback, setFallback] = useState("");
  const [deepseekModel, setDeepseekModel] = useState("");
  const [geminiModel, setGeminiModel] = useState("");

  useEffect(() => {
    if (data) {
      setPrimary(data.llm_primary_provider || "deepseek");
      setFallback(data.llm_fallback_provider || "gemini");
      setDeepseekModel(data.llm_deepseek_model || "deepseek-chat");
      setGeminiModel(data.llm_gemini_model || "gemini-2.5-flash");
    }
  }, [data]);

  const mutation = useMutation({
    mutationFn: (settings: Record<string, string>) =>
      updateLLMSettings(token, settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["llm-settings"] });
    },
  });

  const handleSave = () => {
    mutation.mutate({
      llm_primary_provider: primary,
      llm_fallback_provider: fallback,
      llm_deepseek_model: deepseekModel,
      llm_gemini_model: geminiModel,
    });
  };

  const hasChanges =
    data &&
    (primary !== data.llm_primary_provider ||
      fallback !== data.llm_fallback_provider ||
      deepseekModel !== data.llm_deepseek_model ||
      geminiModel !== data.llm_gemini_model);

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="System Settings" icon={Settings} />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            AI Model Configuration
            {mutation.isSuccess && (
              <Badge variant="default" className="bg-green-600">
                Saved
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary Provider</Label>
              <Select value={primary} onValueChange={setPrimary}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fallback Provider</Label>
              <Select value={fallback} onValueChange={setFallback}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.filter((p) => p.value !== primary).map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>DeepSeek Model</Label>
              <Select value={deepseekModel} onValueChange={setDeepseekModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEEPSEEK_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Gemini Model</Label>
              <Select value={geminiModel} onValueChange={setGeminiModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEMINI_MODELS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || mutation.isPending}
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
