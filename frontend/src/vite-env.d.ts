/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_BASE_URL: string;
    // Add other env variables here as needed
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// CSS module declarations
declare module "*.css" {
    const content: Record<string, string>;
    export default content;
}
