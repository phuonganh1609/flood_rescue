# Skill: Backend Security Best Practices

## Scope
Security practices for Node.js microservices.

## Authentication & Authorization
- Never trust client input
- Validate auth at service boundary
- Use explicit authorization checks per action

## Input Handling
- Validate and sanitize all inputs
- Enforce strict schemas
- Reject unexpected fields

## Secrets
- Never hardcode secrets
- Use environment variables or secret managers
- Rotate secrets periodically

## Data Protection
- Hash sensitive data
- Never log credentials or tokens
- Apply least-privilege access

## Network
- Services must not expose internal ports publicly
- Use allowlists for internal communication

## When to Apply
Use this skill when:
- Handling auth logic
- Reviewing security issues
- Preparing for production deployment
