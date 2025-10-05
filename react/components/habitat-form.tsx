"use client"

import { useState } from "react"
import { useHabitat } from "@/store/use-habitat"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"

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
  const [useManualRadius, setUseManualRadius] = useState(false)
  const [manualRadius, setManualRadius] = useState(6)

  const handleGenerate = () => {
    setInputs(localInputs)
    generateHabitat(useManualRadius ? manualRadius : undefined)
  }

  const toggleFunction = (funcId: string) => {
    const newFunctions = localInputs.functions.includes(funcId)
      ? localInputs.functions.filter((f) => f !== funcId)
      : [...localInputs.functions, funcId]

    setLocalInputs({ ...localInputs, functions: newFunctions })
  }

  const estimatedRadius = Math.ceil(
    (-3 +
      Math.sqrt(
        9 + 12 * (8 * localInputs.crew + 12 * localInputs.functions.length + 2 * (localInputs.durationDays / 30) - 1),
      )) /
      6,
  )

  const activeRadius = useManualRadius ? manualRadius : estimatedRadius
  const totalCells = 3 * activeRadius * activeRadius + 3 * activeRadius + 1

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

          <div className="space-y-3 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <Label htmlFor="manual-radius" className="text-sm text-muted-foreground">
                Manual Radius Control
              </Label>
              <Switch id="manual-radius" checked={useManualRadius} onCheckedChange={setUseManualRadius} />
            </div>

            {useManualRadius && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Radius</span>
                  <span className="text-sm font-mono text-foreground">{manualRadius}</span>
                </div>
                <Slider
                  value={[manualRadius]}
                  onValueChange={(value) => setManualRadius(value[0])}
                  min={3}
                  max={12}
                  step={1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">Adjust the habitat size manually (3-12 rings)</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
        {isGenerating ? "Generating..." : "Generate Habitat"}
      </Button>

      <div className="pt-4 border-t border-border/50">
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="flex justify-between">
            <span>{useManualRadius ? "Manual Radius:" : "Estimated Radius:"}</span>
            <span className="text-foreground font-mono">{activeRadius} rings</span>
          </div>
          <div className="flex justify-between">
            <span>Total Cells:</span>
            <span className="text-foreground font-mono">{totalCells}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
