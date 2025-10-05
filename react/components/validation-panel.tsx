"use client"

import { useHabitat } from "@/store/use-habitat"
import { Card } from "@/components/ui/card"
import { AlertCircle, AlertTriangle, CheckCircle, Filter, ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"

export function ValidationPanel() {
  const { validationResults, placements, objects, zones } = useHabitat()
  const [filter, setFilter] = useState<"all" | "errors" | "warnings">("all")
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Group results by placement/object
  const groupedResults = new Map<
    string,
    {
      objectName: string
      zoneName: string
      results: typeof validationResults
    }
  >()

  validationResults.forEach((result) => {
    // Try to find which placement this result belongs to by checking the message
    let foundPlacement = false

    placements.forEach((placement) => {
      const object = objects.find((o) => o.id === placement.objectId)
      const zone = zones.find((z) => z.id === placement.zoneId)

      if (object && zone) {
        const key = `${placement.objectId}-${placement.zoneId}`

        if (!groupedResults.has(key)) {
          groupedResults.set(key, {
            objectName: object.name,
            zoneName: zone.name,
            results: [],
          })
        }

        groupedResults.get(key)!.results.push(result)
        foundPlacement = true
      }
    })

    // If no specific placement found, add to general group
    if (!foundPlacement) {
      const key = "general"
      if (!groupedResults.has(key)) {
        groupedResults.set(key, {
          objectName: "General",
          zoneName: "Layout",
          results: [],
        })
      }
      groupedResults.get(key)!.results.push(result)
    }
  })

  // Calculate statistics
  const hardFailures = validationResults.filter((r) => r.severity === "hard" && !r.ok)
  const softWarnings = validationResults.filter((r) => r.severity === "soft" && !r.ok)
  const passed = validationResults.filter((r) => r.ok)
  const totalChecks = validationResults.length
  const passRate = totalChecks > 0 ? Math.round((passed.length / totalChecks) * 100) : 0

  // Filter results
  const filteredGroups = Array.from(groupedResults.entries()).filter(([_, group]) => {
    if (filter === "errors") return group.results.some((r) => r.severity === "hard" && !r.ok)
    if (filter === "warnings") return group.results.some((r) => r.severity === "soft" && !r.ok)
    return true
  })

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedGroups(newExpanded)
  }

  return (
    <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Validation Results</h3>
        {totalChecks > 0 && <div className="text-xs font-medium text-muted-foreground">{passRate}% Pass Rate</div>}
      </div>

      <div className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <button
            onClick={() => setFilter(filter === "errors" ? "all" : "errors")}
            className={`flex items-center gap-2 p-2 rounded border transition-all ${
              filter === "errors"
                ? "bg-destructive/20 border-destructive/40"
                : "bg-destructive/10 border-destructive/20 hover:bg-destructive/15"
            }`}
          >
            <AlertCircle className="w-4 h-4 text-destructive" />
            <div className="text-left">
              <div className="font-semibold text-destructive">{hardFailures.length}</div>
              <div className="text-muted-foreground">Errors</div>
            </div>
          </button>

          <button
            onClick={() => setFilter(filter === "warnings" ? "all" : "warnings")}
            className={`flex items-center gap-2 p-2 rounded border transition-all ${
              filter === "warnings"
                ? "bg-yellow-500/20 border-yellow-500/40"
                : "bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/15"
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <div className="text-left">
              <div className="font-semibold text-yellow-500">{softWarnings.length}</div>
              <div className="text-muted-foreground">Warnings</div>
            </div>
          </button>

          <div className="flex items-center gap-2 p-2 rounded bg-green-500/10 border border-green-500/20">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <div className="text-left">
              <div className="font-semibold text-green-500">{passed.length}</div>
              <div className="text-muted-foreground">Passed</div>
            </div>
          </div>
        </div>

        {/* Grouped Results */}
        {filteredGroups.length > 0 ? (
          <div className="space-y-2">
            {filteredGroups.map(([key, group]) => {
              const isExpanded = expandedGroups.has(key)
              const groupErrors = group.results.filter((r) => r.severity === "hard" && !r.ok).length
              const groupWarnings = group.results.filter((r) => r.severity === "soft" && !r.ok).length

              return (
                <div key={key} className="border border-border/50 rounded-lg overflow-hidden">
                  <button
                    onClick={() => toggleGroup(key)}
                    className="w-full flex items-center justify-between p-3 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      )}
                      <div className="text-left">
                        <div className="text-sm font-medium text-foreground">{group.objectName}</div>
                        <div className="text-xs text-muted-foreground">{group.zoneName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {groupErrors > 0 && (
                        <span className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="w-3 h-3" />
                          {groupErrors}
                        </span>
                      )}
                      {groupWarnings > 0 && (
                        <span className="flex items-center gap-1 text-xs text-yellow-500">
                          <AlertTriangle className="w-3 h-3" />
                          {groupWarnings}
                        </span>
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-3 space-y-2 bg-card/30">
                      {group.results
                        .filter((r) => !r.ok)
                        .map((result, index) => (
                          <div
                            key={index}
                            className={`p-2 rounded border space-y-1 ${
                              result.severity === "hard"
                                ? "bg-destructive/5 border-destructive/20"
                                : "bg-yellow-500/5 border-yellow-500/20"
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              {result.severity === "hard" ? (
                                <AlertCircle className="w-3 h-3 text-destructive mt-0.5 flex-shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3 h-3 text-yellow-500 mt-0.5 flex-shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-xs font-medium ${
                                    result.severity === "hard" ? "text-destructive" : "text-yellow-500"
                                  }`}
                                >
                                  {result.message}
                                </div>
                                {result.hint && <div className="text-xs text-muted-foreground mt-1">{result.hint}</div>}
                                <div className="text-xs text-muted-foreground/70 mt-1 font-mono">
                                  Rule: {result.rule}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : validationResults.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No validation results yet</p>
            <p className="mt-1">Place objects to see validation feedback</p>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <Filter className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
            <p>No {filter} found</p>
            <p className="mt-1">Try a different filter</p>
          </div>
        )}
      </div>
    </Card>
  )
}
