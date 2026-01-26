# Skill: Observability and Logging

## Scope
Logging, metrics, and tracing in Node.js microservices.

## Logging
- Use structured JSON logs
- Include requestId / traceId
- Log at boundaries, not everywhere

## Levels
- error: failures requiring action
- warn: unexpected but handled states
- info: key lifecycle events
- debug: local development only

## Metrics
- Track latency, error rate, throughput
- Avoid high-cardinality labels

## Tracing
- Propagate trace IDs across services
- Correlate logs with traces

## Anti-Patterns
- Console.log everywhere
- Logging inside tight loops
- Missing correlation IDs

## When to Apply
Use this skill when:
- Debugging production issues
- Adding observability
- Reviewing logging practices
