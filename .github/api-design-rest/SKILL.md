# Skill: REST API Design for Microservices

## Scope
REST APIs exposed by Node.js microservices.

## Principles
- Resource-oriented URLs
- Stateless requests
- Explicit versioning

## URL Design
- Use nouns, not verbs
- Plural resource names
- Nesting max depth: 2 levels

Example:
GET /v1/users/{id}/sessions

## HTTP Methods
- GET: read
- POST: create or action
- PUT: full replace
- PATCH: partial update
- DELETE: remove

## Responses
- Always return JSON
- Use consistent response envelopes
- Include requestId / traceId if available

## Error Responses
- Use standard HTTP status codes
- Include machine-readable error codes
- Never leak stack traces

## Validation
- Validate input at the boundary
- Reject unknown fields
- Prefer schema-based validation

## When to Apply
Use this skill when:
- Designing new endpoints
- Reviewing API contracts
- Fixing inconsistent APIs
