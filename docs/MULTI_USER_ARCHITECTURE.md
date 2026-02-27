# Multi-User Architecture Overview [UNDER CONSIDERATION]

## Executive Summary

This document provides a high-level overview of the architectural changes required to migrate Sonic Claude from a single-user to a multi-user system supporting **10 concurrent anonymous users**.

## Current State (Single-User)

### Critical Single-User Assumptions
1. **Single SuperCollider Instance**: One scsynth process on port 57110
2. **Global State**: Single composition loaded in memory
3. **Shared Resources**: All users would share the same audio graph
4. **No Isolation**: No user/session concept in backend or frontend
5. **Broadcast WebSockets**: All clients receive the same data

### Architecture Diagram
```
Frontend → Backend → Single scsynth (port 57110)
  ↓          ↓              ↓
Local     Global      Shared Audio
State     State       Graph
```

## Target State (Multi-User)

### Key Changes
1. **SuperCollider Pool**: 5 scsynth instances (2 users per instance)
2. **Session Management**: User sessions with resource isolation
3. **Session-Scoped Services**: Per-user audio engine, playback, mixer
4. **Session-Scoped WebSockets**: Per-user real-time data streams
5. **Resource Allocation**: Per-session node IDs, buses, buffers

### Architecture Diagram
```
Frontend (Session ID) → Backend (Session Manager) → scsynth Pool
     ↓                        ↓                          ↓
Session Store          Session-Scoped Services    5 Instances
(localStorage)         (Isolated State)           (10 Users Max)
```

## Technical Challenges

### 1. SuperCollider Concurrency
**Problem**: SuperCollider is designed for single-user, real-time audio processing.

**Solution**:
- Run multiple scsynth instances (process-level isolation)
- Allocate 2 users per instance (node group isolation within instance)
- Dynamic port allocation (57110-57114 for commands, 57200-57204 for data)

### 2. Resource Allocation
**Problem**: Node IDs, buses, and buffers are global in SuperCollider.

**Solution**:
- Allocate non-overlapping ranges per session
- Session 0: nodes 10000-19999, buses 100-199
- Session 1: nodes 20000-29999, buses 200-299
- Track allocations in SessionManager

### 3. State Isolation
**Problem**: Current backend has global service instances.

**Solution**:
- Session-scoped dependency injection
- Each session gets its own service instances
- Services hold reference to session ID for resource scoping

### 4. WebSocket Broadcasting
**Problem**: Current WebSockets broadcast to all clients.

**Solution**:
- Session-aware WebSocket manager
- Track connections per session ID
- Broadcast only to connections for specific session

### 5. Frontend Session Management
**Problem**: Frontend has no concept of sessions.

**Solution**:
- Add session Zustand store
- Store session ID in localStorage
- Include session ID in all API requests (header)
- Include session ID in WebSocket URLs (query param)

## Implementation Roadmap

### Phase 1: Backend Session Infrastructure (2 weeks)
- [ ] Implement SessionManager service
- [ ] Implement SuperColliderPool service
- [ ] Add session middleware to FastAPI
- [ ] Create session-scoped dependency injection
- [ ] Update all services to accept session parameter
- [ ] Add session API endpoints

**Subagents**: Session Management Architect, SuperCollider Pool Architect

### Phase 2: WebSocket Session Integration (1 week)
- [ ] Implement SessionWebSocketManager
- [ ] Update all WebSocket endpoints to require session ID
- [ ] Update OSC handlers to broadcast to specific sessions
- [ ] Add session-scoped data filtering

**Subagent**: WebSocket Session Architect

### Phase 3: Frontend Session Integration (1 week)
- [ ] Create session Zustand store
- [ ] Implement session initialization hook
- [ ] Update API client to include session ID
- [ ] Update WebSocket hooks to include session ID
- [ ] Add session status UI component

**Subagent**: Frontend Session Integration Specialist

### Phase 4: Testing & Deployment (1 week)
- [ ] End-to-end testing with 10 concurrent users
- [ ] Load testing and performance optimization
- [ ] Session isolation testing
- [ ] Deployment configuration

**All Subagents**

## Resource Requirements

### Development
- **Time**: 5 weeks (1 developer)
- **Testing**: 10 concurrent browser sessions
- **Hardware**: 8GB RAM minimum (for 5 scsynth instances)

### Production
- **Server**: Dedicated server (AWS EC2, DigitalOcean, etc.)
- **CPU**: 4+ cores (for 5 scsynth instances)
- **RAM**: 8GB minimum
- **Storage**: 20GB (for compositions, samples, logs)
- **Network**: Low latency (<50ms) for real-time audio

### Deployment Architecture
```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (Vercel or Static Hosting)                        │
│ - React app                                                 │
│ - Session ID in localStorage                                │
└─────────────────────────────────────────────────────────────┘
                            ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│ Dedicated Server (AWS EC2, DigitalOcean, etc.)             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Nginx (Reverse Proxy)                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ FastAPI Backend (port 8000)                             │ │
│ │ - Session Manager                                       │ │
│ │ - Session-scoped services                               │ │
│ └─────────────────────────────────────────────────────────┘ │
│                            ↓                                 │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ SuperCollider Pool                                      │ │
│ │ - scsynth-0 (ports 57110/57200)                         │ │
│ │ - scsynth-1 (ports 57111/57201)                         │ │
│ │ - scsynth-2 (ports 57112/57202)                         │ │
│ │ - scsynth-3 (ports 57113/57203)                         │ │
│ │ - scsynth-4 (ports 57114/57204)                         │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Constraints & Limitations (MVP)

### Hard Limits
- **Max 10 concurrent users** (5 instances × 2 users)
- **Anonymous users only** (no authentication)
- **In-memory sessions** (lost on server restart)
- **Single server** (no horizontal scaling)

### Acceptable Trade-offs
- Session timeout: 30 minutes of inactivity
- No session persistence across server restarts
- No user accounts or multi-tenancy
- No distributed deployment

## Future Enhancements (Post-MVP)

### User Authentication
- User accounts with login/signup
- Persistent user data (compositions, preferences)
- User profiles and settings

### Multi-Tenancy
- Organizations and teams
- Shared compositions and collaboration
- Role-based access control

### Scalability
- Horizontal scaling (multiple backend servers)
- Distributed session storage (Redis)
- Load balancing across servers
- Auto-scaling based on demand

### Cloud Deployment
- Kubernetes orchestration
- Container-based scsynth instances
- Cloud storage for compositions (S3, GCS)
- CDN for frontend assets

## Risk Assessment

### High Risk
- **SuperCollider stability**: Multiple instances may have unexpected interactions
- **Resource exhaustion**: 10 users may exceed server capacity
- **Session cleanup**: Memory leaks if sessions not properly cleaned up

### Medium Risk
- **WebSocket scaling**: 10 users × 4 WebSocket connections = 40 concurrent connections
- **OSC message throughput**: High-frequency OSC messages may cause bottlenecks
- **Frontend performance**: Multiple tabs with same session may cause issues

### Low Risk
- **Session ID collision**: UUID collision is extremely unlikely
- **Port conflicts**: Port allocation is deterministic and non-overlapping
- **Data isolation**: Session-scoped services ensure proper isolation

## Success Criteria

### Functional
- [ ] 10 concurrent users can create and play compositions simultaneously
- [ ] Each user has isolated audio graph (no cross-user interference)
- [ ] WebSocket streams are session-scoped (no data leaks)
- [ ] Sessions persist across page reloads
- [ ] Session cleanup works correctly on disconnect

### Performance
- [ ] Latency <100ms for API requests
- [ ] WebSocket update rate: 60Hz for transport, 30Hz for spectrum
- [ ] CPU usage <80% with 10 concurrent users
- [ ] Memory usage <6GB with 10 concurrent users

### Reliability
- [ ] No crashes with 10 concurrent users for 1 hour
- [ ] Graceful degradation when max users reached
- [ ] Automatic session cleanup on timeout
- [ ] Health monitoring and auto-restart for scsynth instances

