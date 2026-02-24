---
name: api-client
description: >
  Use when adding or modifying frontend API client methods in compositions.provider.ts.
  Includes request/response types, error handling, and proper HTTP methods.
  Do NOT use for backend endpoints or Zustand store actions.
---

# Frontend API Client Development

## Description
Skill for adding methods to the frontend API client that communicate with backend FastAPI endpoints.

## Instructions

### When to use this skill
Use this skill when adding new API client methods to `frontend/src/services/api/providers/compositions.provider.ts`.

### Prerequisites
- Backend API endpoints exist and are tested
- Request/response Pydantic models are defined in backend
- Know the HTTP method and URL pattern

### Step-by-step process

#### 1. Define Request/Response Types
```typescript
// In compositions.provider.ts

export interface CreateSceneRequest {
  name: string;
  color?: string;
}

export interface SceneResponse {
  id: string;
  name: string;
  color: string;
  index: number;
}
```

#### 2. Add Method to CompositionsProvider Class
```typescript
async createScene(
  compositionId: string,
  request: CreateSceneRequest
): Promise<SceneResponse> {
  const response = await this.client.post<SceneResponse>(
    `/compositions/${compositionId}/clip-launcher/scenes`,
    request
  );
  return response.data;
}
```

#### 3. Export Types from Index
```typescript
// In frontend/src/services/api/providers/index.ts
export type {
  CreateSceneRequest,
  SceneResponse,
} from "./compositions.provider";
```

### Critical patterns

**ALWAYS:**
- Use async/await
- Return `response.data` (not the full response)
- Use proper HTTP method (GET, POST, PUT, DELETE)
- Include compositionId in URL path for sub-resources
- Export request/response types from index.ts

**NEVER:**
- Handle errors in API client (let them bubble up to store actions)
- Add toast notifications (that's the store's job)
- Reload composition (that's the store's job)
- Use axios directly (use `this.client`)

### HTTP Method Guidelines
- **GET**: Retrieve data (no request body)
- **POST**: Create new resource (with request body)
- **PUT**: Update existing resource (with request body)
- **DELETE**: Remove resource (no request body)

### URL Pattern
```
/compositions/{compositionId}/{resource}/{resourceId?}
```

Examples:
- `/compositions/123/tracks` - Get all tracks
- `/compositions/123/tracks/456` - Get specific track
- `/compositions/123/clip-launcher/scenes` - Get all scenes
- `/compositions/123/clip-launcher/scenes/789` - Update specific scene

### Checklist

Before committing:
- [ ] Request/response types defined
- [ ] Method added to CompositionsProvider class
- [ ] Types exported from index.ts
- [ ] Proper HTTP method used
- [ ] URL pattern matches backend endpoint
- [ ] Returns `response.data`
- [ ] No error handling in client method

## Examples

See existing methods in `frontend/src/services/api/providers/compositions.provider.ts`:
- `createTrack` - POST with request body
- `updateTrack` - PUT with request body
- `deleteTrack` - DELETE without request body
- `getComposition` - GET without request body
- `assignClipToSlot` - PUT with path parameters and request body

