/**
 * Effects Feature Types
 */

export interface EffectDefInfo {
    name: string;
    category: string;
    parameters: Record<string, EffectParameter>;
    description: string;
}

export interface EffectParameter {
    name: string;
    default_value: number;
    min_value: number;
    max_value: number;
    description: string;
}

export interface Effect {
    id: string;
    effectdef: string;
    node_id: number;
    parameters: Record<string, number>;
    is_active: boolean;
}

export interface CreateEffectRequest {
    effectdef: string;
    parameters?: Record<string, number>;
}

export interface UpdateEffectRequest {
    parameters: Record<string, number>;
}
