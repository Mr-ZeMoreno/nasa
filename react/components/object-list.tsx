"use client"

import { useHabitat } from "@/store/use-habitat"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Package, CheckCircle2, Trash2 } from "lucide-react"

export function ObjectList() {
  const { objects, placements, mode, removePlacement } = useHabitat()

  const placedObjectIds = new Set(placements.map((p) => p.objectId))

  const handleSelectObject = (object: any) => {
    if (mode === "manual") {
      const event = new CustomEvent("select-object", { detail: object })
      window.dispatchEvent(event)
    }
  }

  const handleRemovePlacement = (objectId: string) => {
    const placement = placements.find((p) => p.objectId === objectId)
    if (placement) {
      removePlacement(placement.id)
    }
  }

  return (
    <Card className="p-4 bg-card/50 backdrop-blur border-border/50">
      <h3 className="text-sm font-semibold text-foreground mb-4">Objects to Place</h3>

      <div className="space-y-2">
        {objects.map((object) => {
          const isPlaced = placedObjectIds.has(object.id)

          return (
            <div
              key={object.id}
              className={`p-3 rounded border transition-colors ${
                isPlaced ? "bg-primary/10 border-primary/30" : "bg-background/50 border-border hover:border-primary/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {isPlaced ? (
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                  ) : (
                    <Package className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground">{object.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {object.slots} {object.slots === 1 ? "cell" : "cells"}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {object.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary border border-primary/30"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  {mode === "manual" && !isPlaced && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 bg-transparent"
                      onClick={() => handleSelectObject(object)}
                    >
                      Place
                    </Button>
                  )}
                  {isPlaced && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRemovePlacement(object.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        })}

        {objects.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-xs">
            <p>No objects to place</p>
            <p className="mt-1">Generate a habitat first</p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Total Objects:</span>
          <span className="text-foreground font-mono">{objects.length}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Placed:</span>
          <span className="text-foreground font-mono">
            {placedObjectIds.size} / {objects.length}
          </span>
        </div>
      </div>
    </Card>
  )
}
