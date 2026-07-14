import { useCallback, useEffect, useState, useRef } from "react";
import { useQuery } from "convex/react";
import { WebContainer } from "@webcontainer/api";

import {
  buildFileTree,
  getFilePath,
} from "../utils/file-tree";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useFiles } from "@/features/projects/hooks/use-files";

// Singleton WebContainer instance
let webcontainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;

const getWebContainer = async (): Promise<WebContainer> => { 
  if (webcontainerInstance) { 
    return webcontainerInstance;
  }

  if (!bootPromise) {
    bootPromise = WebContainer.boot({ coep: "credentialless" });
  }

  webcontainerInstance = await bootPromise;
  return webcontainerInstance;
}

const teardownWebContainer = () => { 
  if (webcontainerInstance) { 
    webcontainerInstance.teardown();
    webcontainerInstance = null;
  }
  bootPromise = null;
}

interface UseWebContainerProps {
  projectId: Id<"projects">;
  enabled: boolean;
  settings?: {
    installCommand?: string;
    devCommand?: string;
  }
 }


export const useWebContainer = ({
  projectId,
  enabled,
  settings }: UseWebContainerProps) => {
  const [status, setStatus] = useState<
    "idle" | "booting" | "installing" | "running" | "error"
  >("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartKey, setRestartKey] = useState(0); // Used to force re-run the effect
  const [terminalOutput, setTerminalOutput] = useState("");

  const containerRef = useRef<WebContainer | null>(null);
  const hasStartedRef = useRef(false);
  const generationRef = useRef(0);
  const activeProjectIdRef = useRef<Id<"projects"> | null>(null);

  // Fetch files from Convex (auto-updates on change)
  const files = useFiles(projectId);

  // Initial boot and mount
  useEffect(() => {
     if (!enabled || !files || files.length === 0) {
      return;
     }

     if (hasStartedRef.current) {
      if (activeProjectIdRef.current === projectId) return;

      // Switched to a different project while a container was already
      // running - tear it down so the new project doesn't get mounted
      // into (and contaminate) the previous project's filesystem.
      generationRef.current++;
      teardownWebContainer();
      containerRef.current = null;
     }

    hasStartedRef.current = true
    activeProjectIdRef.current = projectId

    const start = async () => {
      // Each call to start() gets its own generation number. If restart()
      // bumps generationRef past this run's number, isCurrent() goes false
      // and this run stops touching state - even if it's mid-await.
      const generation = ++generationRef.current;
      const isCurrent = () => generationRef.current === generation;

      try {
        setStatus("booting");
        setError(null);
        setTerminalOutput("");

        const appendOutput = (data: string) => {
          if (!isCurrent()) return;
          setTerminalOutput((prev) => prev + data);
        }

        const container = await getWebContainer();
        if (!isCurrent()) return;
        containerRef.current = container;

        const fileTree = buildFileTree(files);
        await container.mount(fileTree);
        if (!isCurrent()) return;

        container.on("server-ready", (_port, url) => {
          if (!isCurrent()) return;
          setPreviewUrl(url);
          setStatus("running")
        })

        setStatus("installing")

        // Parse install command (default: npm install)
        const installCommand = settings?.installCommand || "npm install";
        const [installBin, ...installArgs] = installCommand.split(" ");
        appendOutput(`$ ${installCommand}\n`);
        const installProcess = await container.spawn(installBin, installArgs);
        installProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              appendOutput(data)
            }
          })
        )

        const installExitCode = await installProcess.exit
        if (!isCurrent()) return;

        if (installExitCode !== 0) {
          throw new Error(
            `${installCommand} failed with exit code ${installExitCode}`
          )
         }

        // Parse dev command (default: npm run dev)
        const devCmd = settings?.devCommand || "npm run dev";
        const [devBin, ...devArgs] = devCmd.split(" ");
        appendOutput(`$ ${devCmd}\n`);
        const devProcess = await container.spawn(devBin, devArgs);
        devProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              appendOutput(data)
            }
          })
        )

        // Don't await this: a healthy dev server never exits. Only react
        // if it dies unexpectedly, so a failing dev command doesn't leave
        // the UI stuck on "installing" forever.
        devProcess.exit.then((code) => {
          if (!isCurrent() || code === 0) return;
          setError(`${devCmd} exited with code ${code}`);
          setStatus("error");
        });

      } catch (e) {
        if (!isCurrent()) return;
        setError(e instanceof Error ? e.message : "Unknown error");
        setStatus("error");
      }
    }
    
    start();
  }, [
    enabled,
    projectId,
    files,
    settings,
    restartKey,
    settings?.devCommand,
    settings?.installCommand,
  ])

  // Sync file changes (hot-reload)
  const syncedContentRef = useRef<Map<Id<"files">, string>>(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !files || status !== "running") return

    const fileMap = new Map(files.map((f) => [f._id, f]));
    const previouslySynced = syncedContentRef.current;
    const nowSynced = new Map<Id<"files">, string>();

    const syncFiles = async () => {
      for (const file of files) {
        if (file.type !== "file" || file.content === undefined || file.storageId) continue;

        nowSynced.set(file._id, file.content);
        if (previouslySynced.get(file._id) === file.content) continue;

        const filePath = getFilePath(file, fileMap);
        const dirPath = filePath.split("/").slice(0, -1).join("/");

        try {
          if (dirPath) {
            await container.fs.mkdir(dirPath, { recursive: true });
          }
          await container.fs.writeFile(filePath, file.content);
        } catch {
          // Best-effort sync into the live container; a failed write
          // here shouldn't take down the preview.
        }
      }
      syncedContentRef.current = nowSynced;
    };

    syncFiles();
  }, [files, status]);
  
  // Reset when disabled
  useEffect(() => {
  if (!enabled) { 
    hasStartedRef.current = false;
    setStatus("idle")
    setPreviewUrl(null);
    setError(null);
  }
  }, [enabled]);

  // Restart the entire WebContainer process
  const restart = useCallback(() => {
    // Invalidate any in-flight start() immediately so its leftover output
    // can't land on the terminal after this restart clears it.
    generationRef.current++;
    teardownWebContainer();
    containerRef.current = null;
    hasStartedRef.current = false
    setStatus("idle");
    setPreviewUrl(null);
    setError(null);
    setRestartKey((k) => k + 1);
  }, [])
  return {
    status,
    previewUrl,
    error,
    terminalOutput,
    restart,  
  }
}