import {indentWithTab} from "@codemirror/commands"
import { oneDark } from "@codemirror/theme-one-dark"
import { keymap } from "@codemirror/view"
import {indentationMarkers} from "@replit/codemirror-indentation-markers"
import { EditorView } from "codemirror"
import { useEffect, useMemo, useRef } from "react"

import { customSetup } from "@/features/editor/extensions/custom-setup"
import { getLanguageExtension } from "@/features/editor/extensions/language-extension"
import { minimap } from "@/features/editor/extensions/minimap"
import { quickEdit } from "@/features/editor/extensions/quick-edit"
import { selectionTooltip } from "@/features/editor/extensions/selection-tooltip"
import { suggestion } from "@/features/editor/extensions/suggestion"
import { customTheme } from "@/features/editor/extensions/theme"

interface Props {
  fileName: string
  initialValue?: string
  onChange: (value: string) => void
}

export const CodeEditor = ({
  fileName,
  initialValue = "",
  onChange
}: Props) => {
  const editorRef =useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

    const languageExtension = useMemo(() => getLanguageExtension(fileName), [fileName]);

  useEffect(() => {
    if (!editorRef.current) return

    const view = new EditorView({
      doc: initialValue,
      parent:editorRef.current,
      extensions: [
        customSetup,
        oneDark,
        customTheme,
        languageExtension,
        suggestion(fileName),
        quickEdit(fileName),
        selectionTooltip(),
        keymap.of([indentWithTab]),
        minimap(),
        indentationMarkers(),
        EditorView.updateListener.of((update) => { 
          if (update.docChanged) {
            onChange(update.state.doc.toString())
          }
        }),
      ]
    })

    viewRef.current = view

    return () => {
    view.destroy()
    }
    
     
   
  }, [languageExtension])
  return (
    <div ref={editorRef} className="size-full pl-4 bg-background"/>

  )
}

