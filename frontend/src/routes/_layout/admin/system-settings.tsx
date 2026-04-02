import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Check, Loader2, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { OpenAPI } from "@/client";
import { PageContainer, PageHeader } from "@/components/Common/PageContainer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const Route = createFileRoute("/_layout/admin/system-settings")({
  component: AdminSystemSettings,
});

const PROVIDERS = [
  { value: "deepseek", label: "DeepSeek", icon: "🔷" },
  { value: "gemini", label: "Google Gemini", icon: "🔶" },
];

const DEEPSEEK_MODELS = [
  { value: "deepseek-chat", label: "DeepSeek Chat (V3)" },
  { value: "deepseek-coder", label: "DeepSeek Coder" },
  { value: "deepseek-reasoner", label: "DeepSeek Reasoner (R1)" },
];

const GEMINI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
];

const BASE_URL = OpenAPI.BASE || "";

async function getAuthToken(): Promise<string> {
  const token =
    typeof OpenAPI.TOKEN === "function"
      ? await OpenAPI.TOKEN({} as never)
      : OpenAPI.TOKEN;
  return token ?? "";
}

async function fetchLLMSettings(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const res = await fetch(`${BASE_URL}/api/v1/admin/llm-settings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch LLM settings (${res.status})`);
  return res.json();
}

async function updateLLMSettings(
  settings: Record<string, string>,
): Promise<Record<string, string>> {
  const token = await getAuthToken();
  const res = await fetch(`${BASE_URL}/api/v1/admin/llm-settings`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Failed to update LLM settings (${res.status})`);
  return res.json();
}

function AdminSystemSettings() {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ["llm-settings"],
    queryFn: fetchLLMSettings,
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
    mutationFn: updateLLMSettings,
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

  const activeProvider = PROVIDERS.find((p) => p.value === primary);
  const activeModel =
    primary === "deepseek"
      ? DEEPSEEK_MODELS.find((m) => m.value === deepseekModel)?.label
      : GEMINI_MODELS.find((m) => m.value === geminiModel)?.label;

  return (
    <PageContainer>
      <PageHeader title="System Settings" icon={Settings} />

      {fetchError && (
        <Alert variant="destructive" className="max-w-2xl mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load settings: {fetchError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Active Config Summary */}
      {data && (
        <Card className="max-w-2xl mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active AI Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Provider:</span>
                <Badge variant="outline" className="font-medium">
                  {activeProvider?.icon} {activeProvider?.label}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Model:</span>
                <Badge variant="secondary">{activeModel}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configuration Form */}
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            AI Model Configuration
            {mutation.isSuccess && (
              <Badge className="bg-green-600 text-white">
                <Check className="h-3 w-3 mr-1" />
                Saved
              </Badge>
            )}
            {mutation.isError && (
              <Badge variant="destructive">Save Failed</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Teachers will use the selected provider and model for AI content
            generation. Changes take effect immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Providers */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Primary Provider</Label>
              <Select value={primary} onValueChange={setPrimary}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.icon} {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used for all AI generation requests
              </p>
            </div>

            <div className="space-y-2">
              <Label>Fallback Provider</Label>
              <Select value={fallback} onValueChange={setFallback}>
                <SelectTrigger>
                  <SelectValue placeholder="Select fallback" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDERS.filter((p) => p.value !== primary).map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.icon} {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Used when primary provider fails
              </p>
            </div>
          </div>

          {/* Models */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>DeepSeek Model</Label>
              <Select value={deepseekModel} onValueChange={setDeepseekModel}>
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
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
                  <SelectValue placeholder="Select model" />
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

          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || mutation.isPending}
              size="lg"
            >
              {mutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
