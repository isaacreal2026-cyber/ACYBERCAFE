import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  GitCommit,
  GitPullRequest,
  Upload,
  RefreshCw,
  Terminal,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "../utils/cn";

interface GitOutput {
  stdout?: string;
  stderr?: string;
  error?: string;
}

const fetchGitData = async (command: string, args: string[] = []) => {
  const apiKey = (import.meta as any).env.VITE_MEDIA_PROXY_API_KEY || 'media_secret_secure_key_2026';
  const response = await fetch("/api/git", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey
    },
    body: JSON.stringify({ command, args }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Git command failed");
  }
  return data as GitOutput;
};

export default function GitClientView() {
  const [activeTab, setActiveTab] = useState<
    "status" | "log" | "commit" | "push" | "pull"
  >("status");
  const [commitMessage, setCommitMessage] = useState("");
  const queryClient = useQueryClient();

  const { data: statusData, isLoading: isStatusLoading, error: statusError } = useQuery({
    queryKey: ["git", "status"],
    queryFn: () => fetchGitData("status"),
    enabled: activeTab === "status",
  });

  const { data: logData, isLoading: isLogLoading, error: logError } = useQuery({
    queryKey: ["git", "log"],
    queryFn: () => fetchGitData("log", ["-n", "10", "--oneline"]),
    enabled: activeTab === "log",
  });

  const gitMutation = useMutation({
    mutationFn: ({ command, args }: { command: string; args?: string[] }) =>
      fetchGitData(command, args),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["git"] });
    },
  });

  const isLoading = isStatusLoading || isLogLoading || gitMutation.isPending;

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    await gitMutation.mutateAsync({ command: "add", args: ["."] });
    await gitMutation.mutateAsync({
      command: "commit",
      args: ["-m", commitMessage],
    });
    setCommitMessage("");
    setActiveTab("status");
  };

  const handlePush = () => gitMutation.mutate({ command: "push" });
  const handlePull = () => gitMutation.mutate({ command: "pull" });

  const output = activeTab === "status" 
    ? statusData || (statusError ? { error: statusError.message } : null)
    : activeTab === "log" 
    ? logData || (logError ? { error: logError.message } : null)
    : gitMutation.data || (gitMutation.isError ? { error: gitMutation.error.message } : null);

  return (
    <div className="flex flex-col h-full bg-surface-bg overflow-hidden text-gray-800">
      <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 flex-shrink-0 bg-surface-card">
        <button
          onClick={() => setActiveTab("status")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
            activeTab === "status"
              ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
              : "text-gray-600 hover:bg-gray-100",
          )}
        >
          <Terminal className="w-4 h-4" />
          Status
        </button>
        <button
          onClick={() => setActiveTab("log")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
            activeTab === "log"
              ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
              : "text-gray-600 hover:bg-gray-100",
          )}
        >
          <RefreshCw className="w-4 h-4" />
          History
        </button>
        <button
          onClick={() => setActiveTab("commit")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
            activeTab === "commit"
              ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
              : "text-gray-600 hover:bg-gray-100",
          )}
        >
          <GitCommit className="w-4 h-4" />
          Commit
        </button>
        <button
          onClick={() => setActiveTab("pull")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
            activeTab === "pull"
              ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
              : "text-gray-600 hover:bg-gray-100",
          )}
        >
          <GitPullRequest className="w-4 h-4" />
          Pull
        </button>
        <button
          onClick={() => setActiveTab("push")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
            activeTab === "push"
              ? "bg-yellow-50 text-yellow-600 border border-yellow-200"
              : "text-gray-600 hover:bg-gray-100",
          )}
        >
          <Upload className="w-4 h-4" />
          Push
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col">
        {activeTab === "commit" && (
          <div className="mb-6 bg-surface-card p-4 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <GitCommit className="w-4 h-4 text-brand-primary" />
              New Commit
            </h3>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Enter commit message..."
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400 transition-all resize-none min-h-[100px]"
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleCommit}
                disabled={isLoading || !commitMessage.trim()}
                className={cn(
                  "px-6 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2",
                  isLoading || !commitMessage.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-brand-primary text-black hover:bg-brand-primary/90",
                )}
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Commit Changes
              </button>
            </div>
          </div>
        )}

        {(activeTab === "pull" || activeTab === "push") && (
          <div className="mb-6 bg-surface-card p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                {activeTab === "pull" ? (
                  <GitPullRequest className="w-4 h-4 text-brand-primary" />
                ) : (
                  <Upload className="w-4 h-4 text-brand-primary" />
                )}
                {activeTab === "pull" ? "Pull from Remote" : "Push to Remote"}
              </h3>
              <p className="text-xs text-gray-500">
                {activeTab === "pull"
                  ? "Fetch and integrate changes from the remote repository."
                  : "Update the remote repository with your local commits."}
              </p>
            </div>
            <button
              onClick={activeTab === "pull" ? handlePull : handlePush}
              disabled={isLoading}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2",
                isLoading
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-brand-primary text-black hover:bg-brand-primary/90",
              )}
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : activeTab === "pull" ? (
                <GitPullRequest className="w-4 h-4" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {activeTab === "pull" ? "Pull Now" : "Push Now"}
            </button>
          </div>
        )}

        <div className="flex-1 flex flex-col bg-gray-900 rounded-xl overflow-hidden shadow-inner font-mono text-sm">
          <div className="px-4 py-2 border-b border-gray-800 bg-gray-950 flex items-center justify-between text-gray-400 text-xs">
            <span>Git Terminal Output</span>
            {isLoading && <RefreshCw className="w-3 h-3 animate-spin" />}
          </div>
          <div className="flex-1 p-4 overflow-y-auto whitespace-pre-wrap text-gray-300">
            {output ? (
              <>
                {output.stdout && (
                  <div className="text-green-400 mb-2">{output.stdout}</div>
                )}
                {output.stderr && (
                  <div className="text-yellow-400 mb-2">{output.stderr}</div>
                )}
                {output.error && (
                  <div className="text-red-400 flex items-start gap-2 mt-4 bg-red-950/30 p-3 rounded">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{output.error}</span>
                  </div>
                )}
                {!output.stdout && !output.stderr && !output.error && (
                  <div className="text-gray-500 italic">
                    Command executed successfully with no output.
                  </div>
                )}
              </>
            ) : (
              <div className="text-gray-500 italic flex items-center justify-center h-full">
                {isLoading ? "Executing command..." : "Ready"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
