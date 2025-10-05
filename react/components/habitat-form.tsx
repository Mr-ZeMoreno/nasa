"use client"

import { useState } from "react"
import { useHabitat } from "@/store/use-habitat"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"

const AVAILABLE_FUNCTIONS = [
  { id: "sleep", label: "Sleep Quarters" },
  { id: "galley", label: "Galley" },
  { id: "hygiene", label: "Hygiene" },
  { id: "eclss", label: "ECLSS" },
  { id: "exercise", label: "Exercise" },
  { id: "medical", label: "Medical" },
  { id: "stowage", label: "Stowage" },
  { id: "command", label: "Command" },
]

export function HabitatForm() {
  const { inputs, setInputs, generateHabitat, isGenerating } = useHabitat()
  const [localInputs, setLocalInputs] = useState(inputs)

  const handleGenerate = () => {
    setInputs(localInputs)
    generateHabitat()
  }

  const toggleFunction = (funcId: string) => {
    const newFunctions = localInputs.functions.includes(funcId)
      ? localInputs.functions.filter((f) => f !== funcId)
      : [...localInputs.functions, funcId]

    setLocalInputs({ ...localInputs, functions: newFunctions })
  }

  return (
    <Card className="p-6 space-y-6 bg-card/50 backdrop-blur border-border/50">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Habitat Configuration</h2>

        <div className="space-y-4">
          {/* Crew Size */}
          <div className="space-y-2">
            <Label htmlFor="crew" className="text-sm text-muted-foreground">
              Crew Size
            </Label>
            <Input
              id="crew"
              type="number"
              min={1}
              max={12}
              value={localInputs.crew}
              onChange={(e) => setLocalInputs({ ...localInputs, crew: Number.parseInt(e.target.value) || 1 })}
              className="bg-background/50"
            />
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration" className="text-sm text-muted-foreground">
              Duration (days)
            </Label>
            <Input
              id="duration"
              type="number"
              min={1}
              max={365}
              value={localInputs.durationDays}
              onChange={(e) => setLocalInputs({ ...localInputs, durationDays: Number.parseInt(e.target.value) || 1 })}
              className="bg-background/50"
            />
          </div>

          {/* Functions */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Required Functions</Label>
            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_FUNCTIONS.map((func) => (
                <button
                  key={func.id}
                  onClick={() => toggleFunction(func.id)}
                  className={`px-3 py-2 text-xs rounded-md border transition-colors ${
                    localInputs.functions.includes(func.id)
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-background/50 border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {func.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
        {isGenerating ? "Generating..." : "Generate Habitat"}
      </Button>

      <div className="pt-4 border-t border-border/50">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>Estimated Radius:</span>
            <span className="text-foreground font-mono">
              {Math.ceil(
                (-3 +
                  Math.sqrt(
                    9 +
                      12 *
                        (8 * localInputs.crew +
                          12 * localInputs.functions.length +
                          2 * (localInputs.durationDays / 30) -
                          1),
                  )) /
                  6,
              )}{" "}
              cells
            </span>
          </div>
          <div className="flex justify-between">
            <span>Total Cells:</span>
            <span className="text-foreground font-mono">
              {(() => {
                const R = Math.ceil(
                  (-3 +
                    Math.sqrt(
                      9 +
                        12 *
                          (8 * localInputs.crew +
                            12 * localInputs.functions.length +
                            2 * (localInputs.durationDays / 30) -
                            1),
                    )) /
                    6,
                )
                return 3 * R * R + 3 * R + 1
              })()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}
