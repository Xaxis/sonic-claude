/**
 * ActivityContainer - Renders all active AI activity indicators
 *
 * Displays animated indicators for all ongoing AI actions.
 * Positioned in the center of the screen with stacked animations.
 */

import { useActivity } from "@/contexts/ActivityContext";
import { ActivityIndicator } from "./ActivityIndicator";

export function ActivityContainer() {
    const { activities, completeActivity } = useActivity();

    if (activities.length === 0) return null;

    return (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
            <div className="flex flex-col gap-3">
                {activities.map((activity, index) => (
                    <div
                        key={activity.id}
                        style={{
                            animationDelay: `${index * 100}ms`,
                        }}
                    >
                        <ActivityIndicator
                            activity={activity}
                            onComplete={() => {
                                // Activity will auto-complete via useAIHandlers timeout
                                // This is just a fallback
                            }}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}

