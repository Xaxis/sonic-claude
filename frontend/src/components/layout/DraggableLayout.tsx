import { useState, useCallback } from 'react'
import GridLayout, { Layout } from 'react-grid-layout'
import { X } from 'lucide-react'

interface PanelConfig {
  id: string
  title: string
  component: React.ReactNode
  defaultLayout: Layout
  closeable?: boolean
}

interface DraggableLayoutProps {
  panels: PanelConfig[]
  onLayoutChange?: (layout: Layout[]) => void
}

export function DraggableLayout({ panels, onLayoutChange }: DraggableLayoutProps) {
  const [closedPanels, setClosedPanels] = useState<Set<string>>(new Set())
  const [layout, setLayout] = useState<Layout[]>(
    panels.map(p => p.defaultLayout)
  )

  const handleLayoutChange = useCallback((newLayout: Layout[]) => {
    setLayout(newLayout)
    onLayoutChange?.(newLayout)
  }, [onLayoutChange])

  const handleClosePanel = useCallback((panelId: string) => {
    setClosedPanels(prev => new Set(prev).add(panelId))
  }, [])

  const handleOpenPanel = useCallback((panelId: string) => {
    setClosedPanels(prev => {
      const next = new Set(prev)
      next.delete(panelId)
      return next
    })
  }, [])

  const visiblePanels = panels.filter(p => !closedPanels.has(p.id))
  const hiddenPanels = panels.filter(p => closedPanels.has(p.id))

  return (
    <div className="h-full flex flex-col">
      {/* Panel Toggle Bar */}
      {hiddenPanels.length > 0 && (
        <div className="flex gap-2 p-3 panel-glass border-b border-primary/10 flex-shrink-0 backdrop-blur-xl">
          <span className="text-xs text-primary/50 mr-2 font-medium tracking-wider">HIDDEN:</span>
          {hiddenPanels.map(panel => (
            <button
              key={panel.id}
              onClick={() => handleOpenPanel(panel.id)}
              className="px-3 py-1.5 text-xs bg-primary/5 hover:bg-primary/15 border border-primary/20 hover:border-primary/40 rounded-md text-primary transition-all duration-200 font-medium tracking-wide"
            >
              + {panel.title}
            </button>
          ))}
        </div>
      )}

      {/* Grid Layout */}
      <div className="flex-1 overflow-auto">
        <GridLayout
          className="layout"
          layout={layout}
          cols={12}
          rowHeight={20}
          width={window.innerWidth - 50}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".drag-handle"
          compactType="vertical"
          preventCollision={false}
          margin={[12, 12]}
          containerPadding={[8, 8]}
        >
          {visiblePanels.map(panel => (
            <div
              key={panel.id}
              className="panel-glass rounded-xl overflow-hidden flex flex-col shadow-2xl hover:shadow-primary/10 transition-shadow duration-300"
            >
              {/* Panel Header */}
              <div className="drag-handle flex items-center justify-between px-4 py-3 bg-gradient-to-r from-primary/5 to-secondary/5 border-b border-primary/10 cursor-move group">
                <span className="text-xs font-bold text-primary select-none tracking-[0.15em] group-hover:text-glow-cyan transition-all">
                  {panel.title}
                </span>
                <div className="flex items-center gap-1">
                  {panel.closeable !== false && (
                    <button
                      onClick={() => handleClosePanel(panel.id)}
                      className="p-1.5 hover:bg-destructive/20 rounded-md transition-all duration-200 group/btn"
                      title="Close panel"
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground group-hover/btn:text-destructive transition-colors" />
                    </button>
                  )}
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-auto">
                {panel.component}
              </div>
            </div>
          ))}
        </GridLayout>
      </div>
    </div>
  )
}

