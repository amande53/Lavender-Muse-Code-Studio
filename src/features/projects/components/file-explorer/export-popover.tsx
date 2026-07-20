import { useAuth, useClerk } from "@clerk/nextjs";
import { useForm } from "@tanstack/react-form";
import ky, { HTTPError } from "ky";
import {
  CheckCheckIcon,
  CheckCircle2Icon,
  ExternalLinkIcon,
  LoaderIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";
import Link from "next/link";
import React from "react";
import { FaGithub } from "react-icons/fa";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Id } from "@/convex/_generated/dataModel";
import { useProject } from "@/features/projects/hooks/use-projects";

const formSchema = z.object({
  repoName: z
    .string()
    .min(1, "Repository name is required")
    .max(100, "Repository name must be less than 100 characters")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Repository name can only contain letters, numbers, underscores, hyphens, and periods"
    ),
  visibility: z.enum(["public", "private"]),
  description: z.string().max(350, "Description must be less than 350 characters"),
});

interface ExportPopoverProps {
  projectId: Id<"projects">;
}

export const ExportPopover = ({ projectId }: ExportPopoverProps) => {
  const { openUserProfile } = useClerk();
  const { isLoaded, has } = useAuth();
  const hasPro = has?.({ plan: "pro" }) ?? false;
  const [open, setOpen] = React.useState(false);
  const project = useProject(projectId);

  const exportStatus = project?.exportStatus;
  const exportRepoUrl = project?.exportRepoUrl;

  const form = useForm({
    defaultValues: {
      repoName: project?.name?.replace(/[^a-zA-Z0-9_.-]/g, "-") ?? "",
      visibility: "private" as "public" | "private",
      description: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        await ky.post("/api/github/export", {
          json: {
            projectId,
            repoName: value.repoName,
            visibility: value.visibility,
            description: value.description || undefined,
          },
        });

        toast.success("Export started...");
      } catch (error) {
        if (error instanceof HTTPError) {
          const body = error.data as { error?: string } | undefined;

          // Defensive fallback: the popover already gates on `hasPro` before
          // showing this form, but the client's plan status can be briefly
          // stale, so the server re-checks and can still reject the export.
          if (body?.error?.includes("Pro Plan required")) {
            toast.error("You need a Pro subscription to export GitHub repositories", {
              action: {
                label: "Upgrade to Pro",
                onClick: () => openUserProfile(),
              },
            });

            setOpen(false);
            return;
          }

          if (body?.error?.includes("reconnect your GitHub account")) {
            toast.error("GitHub account not connected", {
              action: {
                label: "Connect Github",
                onClick: () => {
                  openUserProfile();
                },
              },
            });

            setOpen(false);
            return;
          }
        }

        toast.error("Unable to export repository.");
      }
    },
  });

  const handleCancelExport = async () => {
    try {
      await ky.post("/api/github/export/cancel", {
        json: {
          projectId,
        },
      });
    } catch (error) {
      if (error instanceof HTTPError) {
        const body = error.data as { error?: string } | undefined;
        toast.error(body?.error ?? "Unable to cancel export.");
        return;
      }

      toast.error("Unable to cancel export.");
    }
  };

  const handleResetExport = async () => {
    try {
      await ky.post("/api/github/export/reset", {
        json: {
          projectId,
        },
      });
      setOpen(false);
    } catch (error) {
      if (error instanceof HTTPError) {
        const body = error.data as { error?: string } | undefined;
        toast.error(body?.error ?? "Unable to reset export state.");
        return;
      }

      toast.error("Unable to reset export state.");
    }
  };

  const renderContent = () => {
    if (exportStatus === "exporting") {
      return (
        <div className="flex flex-col items-center gap-3">
          <LoaderIcon className="size-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Exporting to GitHub...</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancelExport}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      );
    }

    if (exportStatus === "completed" && exportRepoUrl) {
      return (
        <div className="flex flex-col items-center gap-3">
          <CheckCircle2Icon className="size-6 text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.65)]" />
          <p className="text-sm font-medium">Repository exported successfully!</p>
          <div className="flex flex-col w-full gap-2">
            <Button
              size="sm"
              className="w-full"
              asChild
            >
              <Link
                href={exportRepoUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Repository <ExternalLinkIcon className="size-4 mr-1" />
              </Link>
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={handleResetExport}
            >
              Close
            </Button>
          </div>
        </div>
      );
    }
    if (exportStatus === "failed") {
      return (
        <div className="flex flex-col items-center gap-3">
          <XCircleIcon className="size-6 text-fuchsia-300 drop-shadow-[0_0_8px_rgba(240,171,252,0.65)]" />
          <p className="text-sm text-muted-foreground">Export failed. Please try again.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetExport}
            className="w-full"
          >
            Retry
          </Button>
        </div>
      );
    }

    if (isLoaded && !hasPro) {
      return (
        <div className="flex flex-col items-center gap-3 text-center">
          <SparklesIcon className="size-6 text-muted-foreground" />
          <p className="text-sm font-medium">Export to GitHub is a Pro feature</p>
          <p className="text-xs text-muted-foreground">
            Upgrade to Pro to export this project to a GitHub repository.
          </p>
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              setOpen(false);
              openUserProfile();
            }}
          >
            Upgrade to Pro
          </Button>
        </div>
      );
    }

    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          form.handleSubmit();
        }}
      >
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Export to GitHub</h4>
          <p className="text-xs text-muted-foreground">
            Export your project to a GitHub repository.
          </p>
        </div>
        <form.Field name="repoName">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Repository Name</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="my-project"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="visibility">
          {(field) => {
            return (
              <Field>
                <FieldLabel htmlFor={field.name}>Visibility</FieldLabel>
                <Select
                  value={field.state.value}
                  onValueChange={(value: "public" | "private") => field.handleChange(value)}
                >
                  <SelectTrigger id={field.name}>
                    <SelectValue placeholder="Select visibility" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            );
          }}
        </form.Field>

        <form.Field name="description">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                <Textarea
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="A short description of your project"
                  rows={2}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.Field>

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              size="sm"
              className="w-full"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Repository"}
            </Button>
          )}
        </form.Subscribe>
      </form>
    );
  };

  const getStatusIcon = () => {
    if (exportStatus === "exporting") {
      return <LoaderIcon className="size-4 animate-spin text-muted-foreground" />;
    }
    if (exportStatus === "completed") {
      return (
        <CheckCheckIcon className="size-4 text-cyan-300 drop-shadow-[0_0_8px_rgba(103,232,249,0.65)]" />
      );
    }
    if (exportStatus === "failed") {
      return (
        <XCircleIcon className="size-4 text-fuchsia-300 drop-shadow-[0_0_8px_rgba(240,171,252,0.65)]" />
      );
    }
    return (
      <FaGithub className="size-4 text-violet-300 drop-shadow-[0_0_6px_rgba(196,181,253,0.55)]" />
    );
  };
  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 h-full px-3 cursor-pointer text-muted-foreground border-l hover:bg-accent/30"
        >
          {getStatusIcon()}
          <span className="text-sm">Export</span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80"
        align="start"
      >
        {renderContent()}
      </PopoverContent>
    </Popover>
  );
};
