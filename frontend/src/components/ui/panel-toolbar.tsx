import * as React from "react";

export interface PanelToolbarProps {
    /** Tools to display on the left side of the toolbar */
    toolsLeft: React.ReactNode;

    /** Tools to display in the center of the toolbar */
    toolsCenter: React.ReactNode;

    /** Tools to display on the right side of the toolbar */
    toolsRight: React.ReactNode;
}

export const PanelToolbar = React.forwardRef<HTMLDivElement, PanelToolbarProps>(
    (
        {
            toolsLeft,
            toolsCenter,
            toolsRight,
        }
    ) => {
        return (
            <div className="px-4 py-3 bg-gradient-to-r from-muted/20 to-muted/10 flex items-center justify-between">
                {toolsLeft}
                {toolsCenter}
                {toolsRight}
            </div>
        );
    }
);

PanelToolbar.displayName = "PanelToolbar";
