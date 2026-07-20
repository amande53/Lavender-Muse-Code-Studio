import { useAuth, useClerk } from "@clerk/nextjs";
import { useForm } from "@tanstack/react-form";
import ky, { HTTPError } from "ky";
import { SparklesIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Id } from "@/convex/_generated/dataModel";
import { navigateFullPage } from "@/lib/navigation";

const formSchema = z.object({
  url: z.url("Please enter a valid URL"),
});

interface ImportGithubDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportGithubDialog = ({ open, onOpenChange }: ImportGithubDialogProps) => {
  const { openUserProfile } = useClerk();
  const { isLoaded, has } = useAuth();
  const hasPro = has?.({ plan: "pro" }) ?? false;

  const form = useForm({
    defaultValues: {
      url: "",
    },
    validators: {
      onSubmit: formSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const { projectId } = await ky
          .post("/api/github/import", {
            json: {
              url: value.url,
            },
          })
          .json<{
            success: boolean;
            projectId: Id<"projects">;
            eventId: string;
          }>();

        toast.success("Importing Repository");
        onOpenChange(false);
        form.reset();
        navigateFullPage(`/projects/${projectId}`);
      } catch (error) {
        if (error instanceof HTTPError) {
          const body = error.data as { error?: string } | undefined;

          // Defensive fallback: the dialog already gates on `hasPro` before
          // showing this form, but the client's plan status can be briefly
          // stale, so the server re-checks and can still reject the import.
          if (body?.error?.includes("Pro Plan required")) {
            toast.error("You need a Pro subscription to import GitHub repositories", {
              action: {
                label: "Upgrade to Pro",
                onClick: () => openUserProfile(),
              },
            });
            onOpenChange(false);
            return; 
          }
          if (body?.error?.includes("GitHub token not found")) {
            toast.error("GitHub account not connected", {
              action: {
                label: "Connect Github",
                onClick: () => {
                  openUserProfile();
                },
              },
            });

            onOpenChange(false);
            return;
          }
        }

        toast.error("Unable to import repository. Please check the URL and try again.");
      }
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent>
        {isLoaded && !hasPro ? (
          <>
            <DialogHeader>
              <DialogTitle>Import from GitHub</DialogTitle>
              <DialogDescription>
                Importing repositories from GitHub is a Pro feature.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <SparklesIcon className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground max-w-xs">
                Upgrade to Pro to import repositories directly from GitHub.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  openUserProfile();
                }}
              >
                Upgrade to Pro
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Import from GitHub</DialogTitle>
              <DialogDescription>
                Enter a GitHub repository URL to import it into Lavender Muse. The repository will
                be cloned and its contents will be available in your project.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
            >
              <form.Field name="url">
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>GitHub Repository URL</FieldLabel>
                      <Input
                        id={field.name}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                        placeholder="https://github.com/owner/repo"
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.Field>

              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>

                <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                  {([canSubmit, isSubmitting]) => (
                    <Button
                      type="submit"
                      disabled={!canSubmit || isSubmitting}
                    >
                      {isSubmitting ? "Importing..." : "Import"}
                    </Button>
                  )}
                </form.Subscribe>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
