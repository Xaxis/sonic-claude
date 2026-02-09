/**
 * Base API Client
 * Provides core HTTP request functionality with error handling
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export class APIError extends Error {
    constructor(
        message: string,
        public status: number,
        public endpoint: string
    ) {
        super(message);
        this.name = "APIError";
    }
}

export class BaseAPIClient {
    protected baseURL: string;

    constructor(baseURL: string = API_BASE) {
        this.baseURL = baseURL;
    }

    /**
     * Make an HTTP request
     */
    protected async request<T>(
        endpoint: string,
        options?: RequestInit
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...options?.headers,
                },
            });

            if (!response.ok) {
                let errorMessage = response.statusText;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.detail || errorData.message || errorMessage;
                } catch {
                    // If response is not JSON, use statusText
                }
                throw new APIError(errorMessage, response.status, endpoint);
            }

            // Handle 204 No Content
            if (response.status === 204) {
                return {} as T;
            }

            return response.json();
        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(
                error instanceof Error ? error.message : "Network error",
                0,
                endpoint
            );
        }
    }

    /**
     * GET request
     */
    protected async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: "GET" });
    }

    /**
     * POST request
     */
    protected async post<T>(
        endpoint: string,
        data?: any
    ): Promise<T> {
        return this.request<T>(endpoint, {
            method: "POST",
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * PUT request
     */
    protected async put<T>(
        endpoint: string,
        data?: any
    ): Promise<T> {
        return this.request<T>(endpoint, {
            method: "PUT",
            body: data ? JSON.stringify(data) : undefined,
        });
    }

    /**
     * DELETE request
     */
    protected async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: "DELETE" });
    }
}

