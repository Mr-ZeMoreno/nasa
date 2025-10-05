"use client"

import { useHabitat } from "@/store/use-habitat"
import { Card } from "@/components/ui/card"
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react"

export function ValidationPanel() {
  const { validationResults } = useHabitat()

  const hardFailures = validationResults.filter((r) => r.severity === "hard" && !r.ok)
  const softWarnings = validationResults.filter((r) => r.severity === "soft" && !r.ok)
  const passed = validationResults.filter((r) => r.ok)

  return (
    <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
      <h3 className="text-sm font-semibold text-foreground mb-4">Validation Results</h3>

      <div className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <div>
              <div className="font-semibold text-destructive">{hardFailures.length}</div>
              <div className="text-muted-foreground">Errors</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/20">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <div>
              <div className="font-semibold text-yellow-500">{softWarnings.length}</div>
              <div className="text-muted-foreground">Warnings</div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/20">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div>
              <div className="font-semibold text-green-500">{passed.length}</div>
              <div className="text-muted-foreground">Passed</div>
            </div>
          </div>
        </div>

        {/* Hard Failures */}
        {hardFailures.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-destructive flex items-center gap-2">
              <AlertCircle className="w-3 h-3" />
              Critical Issues
            </h4>
            {hardFailures.map((result, index) => (
              <div key={index} className="p-3 rounded bg-destructive/5 border border-destructive/20 space-y-1">
                <div className="text-xs font-medium text-destructive">{result.message}</div>
                {result.hint && <div className="text-xs text-muted-foreground">{result.hint}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Soft Warnings */}
        {softWarnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-yellow-500 flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Warnings
            </h4>
            {softWarnings.map((result, index) => (
              <div key={index} className="p-3 rounded bg-yellow-500/5 border border-yellow-500/20 space-y-1">
                <div className="text-xs font-medium text-yellow-500">{result.message}</div>
                {result.hint && <div className="text-xs text-muted-foreground">{result.hint}</div>}
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {validationResults.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <p>No validation results yet</p>
            <p className="mt-1">Place objects to see validation feedback</p>
          </div>
        )}
      </div>
    </Card>
  )
}
