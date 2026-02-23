# Skill: MongoDB Data Modeling

## Scope
MongoDB usage in Node.js microservices.

## Modeling Principles
- Model data based on access patterns
- Prefer embedding over referencing when bounded
- Keep documents small and predictable

## Schema Rules
- Always define explicit schemas (e.g. Mongoose, Zod)
- Avoid unbounded arrays
- Use indexes intentionally, not by default

## IDs and References
- Use ObjectId consistently
- Do not reference documents across microservices
- Denormalize when read performance matters

## Transactions
- Avoid cross-collection transactions when possible
- Use transactions only for true invariants

## Migrations
- Backward-compatible schema changes
- Never require downtime for migrations

## Anti-Patterns
- SQL-style normalization
- Massive documents
- Dynamic schema without validation

## When to Apply
Use this skill when:
- Designing collections
- Reviewing MongoDB performance issues
- Refactoring schemas
