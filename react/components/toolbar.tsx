"use client"

import { useHabitat } from "@/store/use-habitat"
import { Button } from "@/components/ui/button"
import { Download, Upload, RotateCcw } from "lucide-react"

export function Toolbar() {
  const { mode, setMode, exportLayout, importLayout, reset } = useHabitat()

  const handleExport = () => {
    const json = exportLayout()
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `habitat-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const json = e.target?.result as string
          importLayout(json)
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <div className="flex items-center gap-2 p-4 border-b border-border/50 bg-card/30 backdrop-blur">
      <div className="flex items-center gap-1 bg-background/50 rounded-lg p-1">
        <Button
          variant={mode === "auto" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("auto")}
          className="text-xs"
        >
          Auto
        </Button>
        <Button
          variant={mode === "manual" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("manual")}
          className="text-xs"
        >
          Manual
        </Button>
      </div>

      <div className="flex-1" />

      <Button variant="outline" size="sm" onClick={handleImport}>
        <Upload className="w-4 h-4 mr-2" />
        Import
      </Button>

      <Button variant="outline" size="sm" onClick={handleExport}>
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>

      <Button variant="outline" size="sm" onClick={reset}>
        <RotateCcw className="w-4 h-4 mr-2" />
        Reset
      </Button>
    </div>
  )
}
