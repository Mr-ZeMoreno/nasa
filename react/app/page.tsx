"use client"

import { HabitatForm } from "@/components/habitat-form"
import { Toolbar } from "@/components/toolbar"
import { HabitatCanvas } from "@/components/habitat-canvas"
import { ValidationPanel } from "@/components/validation-panel"
import { ObjectList } from "@/components/object-list"
import { MetricsDashboard } from "@/components/metrics-dashboard"
import { useHabitat } from "@/store/use-habitat"

export default function Home() {
  const { zones } = useHabitat()

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-foreground">HabitatX</h1>
          <p className="text-sm text-muted-foreground">Space Habitat Design Platform</p>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Form & Objects */}
        <aside className="w-80 border-r border-border/50 bg-card/20 overflow-y-auto">
          <div className="p-4 space-y-4">
            <HabitatForm />
            <ObjectList />
          </div>
        </aside>

        {/* Center - Canvas */}
        <main className="flex-1 relative bg-background">
          {zones.length > 0 ? (
            <HabitatCanvas />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-lg mb-2">Configure and generate your habitat</p>
                <p className="text-sm">Use the form on the left to get started</p>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel - Metrics & Validation */}
        <aside className="w-80 border-l border-border/50 bg-card/20 overflow-y-auto">
          <div className="p-4 space-y-4">
            <MetricsDashboard />
            <ValidationPanel />
          </div>
        </aside>
      </div>
    </div>
  )
}
