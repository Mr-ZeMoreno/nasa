"use client"

import { useHabitat } from "@/store/use-habitat"
import { Card } from "@/components/ui/card"
import { calculateMetrics } from "@/lib/metrics"
import { Progress } from "@/components/ui/progress"
import { CheckCircle, XCircle, TrendingUp, Package, Layers, Weight } from "lucide-react"

export function MetricsDashboard() {
  const { inputs, zones, placements, objects } = useHabitat()

  if (zones.length === 0) {
    return (
      <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
        <div className="text-center py-8 text-muted-foreground text-xs">
          <p>No metrics available</p>
          <p className="mt-1">Generate a habitat first</p>
        </div>
      </Card>
    )
  }

  const metrics = calculateMetrics(inputs, zones, placements, objects)

  return (
    <div className="space-y-4">
      {/* Overall Stats */}
      <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Overall Statistics
        </h3>

        <div className="space-y-4">
          {/* Cell Utilization */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Cell Utilization</span>
              <span className="text-foreground font-mono">{metrics.utilizationPercent.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.utilizationPercent} className="h-2" />
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>
                {metrics.usedCells} / {metrics.totalCells} cells
              </span>
              <span>{metrics.freeCells} free</span>
            </div>
          </div>

          {/* Object Placement */}
          <div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">Object Placement</span>
              <span className="text-foreground font-mono">{metrics.placementPercent.toFixed(1)}%</span>
            </div>
            <Progress value={metrics.placementPercent} className="h-2" />
            <div className="flex justify-between text-xs mt-1 text-muted-foreground">
              <span>
                {metrics.placedObjects} / {metrics.totalObjects} placed
              </span>
              <span>{metrics.unplacedObjects} remaining</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Physical Properties */}
      <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Weight className="w-4 h-4" />
          Physical Properties
        </h3>

        <div className="space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Volume</span>
            <span className="text-foreground font-mono">{metrics.totalVolumeM3.toFixed(1)} m³</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Used Volume</span>
            <span className="text-foreground font-mono">{metrics.usedVolumeM3.toFixed(1)} m³</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Volume per Crew</span>
            <span className="text-foreground font-mono">{metrics.volumePerCrew.toFixed(1)} m³</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-border/50">
            <span className="text-muted-foreground">Est. Mass</span>
            <span className="text-foreground font-mono">{(metrics.estimatedMassKg / 1000).toFixed(1)} tons</span>
          </div>
        </div>
      </Card>

      {/* Zone Breakdown */}
      <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Layers className="w-4 h-4" />
          Zone Breakdown
        </h3>

        <div className="space-y-3">
          {metrics.zoneStats.map((zone) => (
            <div key={zone.zoneId} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-foreground font-medium">{zone.zoneName}</span>
                <span className="text-muted-foreground font-mono">{zone.utilizationPercent.toFixed(0)}%</span>
              </div>
              <Progress value={zone.utilizationPercent} className="h-1.5" />
              <div className="text-xs text-muted-foreground">
                {zone.used} / {zone.capacity} cells
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Functional Coverage */}
      <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package className="w-4 h-4" />
          Functional Coverage
        </h3>

        <div className="space-y-2">
          {metrics.functionalCoverage.map((func) => (
            <div key={func.function} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                {func.present ? (
                  <CheckCircle className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-destructive" />
                )}
                <span className={func.present ? "text-foreground" : "text-muted-foreground"}>
                  {func.function.charAt(0).toUpperCase() + func.function.slice(1)}
                </span>
              </div>
              {func.required && !func.present && (
                <span className="text-xs text-destructive bg-destructive/10 px-2 py-0.5 rounded">Required</span>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
