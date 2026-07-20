"use client";

import "@xterm/xterm/css/xterm.css";

import { WebContainer } from "@webcontainer/api";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { useEffect, useRef } from "react";


interface PreviewTerminalProps {
  output: string
  container: WebContainer | null
}



export const PreviewTerminal = ({ output, container }: PreviewTerminalProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const lastLengthRef = useRef(0);

  // Initialize the terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return;

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      disableStdin: false,
      fontSize: 12,
      fontFamily: "monospace",
      theme: {
        background: "#1e1e1e",
        foreground: "#ffffff",
      },
    })

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(containerRef.current);

    terminalRef.current = terminal;
    fitAddonRef.current = fitAddon

    // Write existing output on mount
    if (output) {
      terminal.write(output);
      lastLengthRef.current = output.length;
    }

    requestAnimationFrame(() => fitAddon.fit());

    const resizeObserve = new ResizeObserver(() => fitAddon.fit());
    resizeObserve.observe(containerRef.current);

    return () => {
      resizeObserve.disconnect();
      terminal.dispose();
      terminalRef.current = null;
      fitAddonRef.current = null;
    }
    // "output" is intentionally omitted from the dependency array to avoid re-initializing the terminal on every output change
   }, []);

  // Write output
  useEffect(() => {
    if (!terminalRef.current) return;
    if (output.length < lastLengthRef.current) {
      terminalRef.current.clear();
      lastLengthRef.current = 0;
    }

    const newOutput = output.slice(lastLengthRef.current);
    if (newOutput) {
      terminalRef.current.write(newOutput);
      lastLengthRef.current = output.length;
    }
  }, [output])

  // Spawn an interactive shell in the container so the user can type
  // commands, and pipe its I/O to/from the terminal.
  useEffect(() => {
    const terminal = terminalRef.current;
    if (!container || !terminal) return;

    let shellProcess: Awaited<ReturnType<WebContainer["spawn"]>> | null = null;
    let inputWriter: WritableStreamDefaultWriter<string> | null = null;
    let disposed = false;

    const startShell = async () => {
      const process = await container.spawn("jsh", {
        terminal: { cols: terminal.cols, rows: terminal.rows },
      });

      if (disposed) {
        process.kill();
        return;
      }

      shellProcess = process;
      inputWriter = process.input.getWriter();

      process.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        })
      );
    };

    startShell();

    const onDataDisposable = terminal.onData((data) => {
      inputWriter?.write(data);
    });

    const onResizeDisposable = terminal.onResize(({ cols, rows }) => {
      shellProcess?.resize({ cols, rows });
    });

    return () => {
      disposed = true;
      onDataDisposable.dispose();
      onResizeDisposable.dispose();
      inputWriter?.releaseLock();
      shellProcess?.kill();
    };
  }, [container])

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 p-3 [&_.xterm:h-full!] [&_.xterm-viewport:h-full!] [&_.xterm-screen:h-full!] bg-sidebar"
      style={{ width: "100%", height: "100%" }}
    />
  );
}