# Skill: Node.js Microservice Architecture

## Scope
Node.js backend services in a microservice architecture.

## Goals
- Maintain service isolation
- Enable independent deployment
- Reduce tight coupling
- Improve scalability and fault tolerance

## Architecture Rules
- Each service must have a single business responsibility
- No shared databases between services
- Communicate via HTTP or async messaging only
- Avoid cross-service imports or shared runtime code

## Code Guidelines
- Use explicit dependency injection
- Separate layers: transport, application, domain, infrastructure
- Do not embed business logic in controllers
- Services must be stateless

## Error Handling
- Never throw raw errors to the client
- Map domain errors to HTTP errors explicitly
- Use centralized error middleware

## Anti-Patterns (Avoid)
- Shared MongoDB collections across services
- Fat controllers
- Global mutable state
- Implicit service-to-service coupling

## When to Apply
Use this skill when:
- Designing a new service
- Reviewing service boundaries
- Refactoring a monolith into microservices
