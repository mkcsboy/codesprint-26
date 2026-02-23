'use client'

import Editor from "@monaco-editor/react"
import { useRef } from "react"

interface CodeEditorProps {
  starterCode: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

export default function CodeEditor({ starterCode, onChange, readOnly = false }: CodeEditorProps) {
  // FIX: Added <any> so it can hold the Editor object
  const editorRef = useRef<any>(null)

  function handleEditorDidMount(editor: any) {
    editorRef.current = editor
    // Optional: Add custom keybindings or config here
  }

  return (
    <div className="w-full h-full border-2 border-[#444] rounded-lg overflow-hidden shadow-2xl bg-[#1e1e1e] flex flex-col">
      {/* MAC-STYLE TOP BAR */}
      <div className="bg-[#2d2d2d] px-4 py-2 flex items-center justify-between border-b border-[#444] shrink-0">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="text-xs text-gray-500 font-mono">main.py</div>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="flex-grow relative">
        <Editor
          height="100%"
          defaultLanguage="python"
          value={starterCode}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            padding: { top: 16 },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            readOnly: readOnly,
            fontFamily: "'Courier New', monospace",
          }}
          onMount={handleEditorDidMount}
          onChange={(value) => onChange && onChange(value || "")}
        />
      </div>
    </div>
  )
}