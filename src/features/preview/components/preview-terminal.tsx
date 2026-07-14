"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import { WebContainer } from "@webcontainer/api";

import "@xterm/xterm/css/xterm.css";


interface PreviewTerminalProps { 
  output: string
}



export const PreviewTerminal = ({ output }: PreviewTerminalProps) => { 
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
      disableStdin: true,
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

  return (
    <div
      ref={containerRef}
      className="flex-1 min-h-0 p-3 [&_.xterm:h-full!] [&_.xterm-viewport:h-full!] [&_.xterm-screen:h-full!] bg-sidebar"
      style={{ width: "100%", height: "100%" }}
    />
  );
}