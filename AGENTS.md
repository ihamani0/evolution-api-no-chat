# Evolution API - AI Agent Guidelines

This document provides guidelines for AI agents working with the Evolution API codebase.

## Project Overview

**Evolution API** is a production-ready, multi-tenant WhatsApp API platform built with Node.js, TypeScript, and Express.js.

## Build, Test & Development Commands

```bash
# Development
npm run dev:server     # Hot reload server
npm start              # Direct execution
npm run build          # Production build
npm run start:prod     # Run production build

# Testing
npm test               # Watch mode (runs test/all.test.ts)
npx tsx test/example.test.ts    # Run single test file
npx tsx test/example.test.ts -t "test name"  # Run specific test

# Linting
npm run lint           # ESLint with auto-fix
npm run lint:check     # ESLint check only

# Database (set DATABASE_PROVIDER=postgresql or mysql first)
npm run db:generate    # Generate Prisma client
npm run db:migrate:dev # Run migrations

# Commits
npm run commit         # Interactive commit (Commitizen)
```

## Code Style Guidelines

### Formatting (Prettier)
- **2-space indentation**, no tabs
- **Single quotes**, trailing commas
- **120-character line limit**
- **Semi-colons** required

### Import Order (simple-import-sort)
1. Node built-ins (path, fs, etc.)
2. External packages (axios, express)
3. Internal modules (@/, ./)
4. Relative imports
5. Type imports (type { ... })

### Naming Conventions
- **Files**: `kebab-case.type.ts` (e.g., `whatsapp.baileys.service.ts`)
- **Classes**: `PascalCase`
- **Functions/variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `PascalCase` with `I` prefix optional

### TypeScript Rules
- **Strict mode** enabled - avoid `any`
- Use **interfaces** for object contracts
- Use **enums** for status values
- Use **generics** for reusable components

### Error Handling Pattern
```typescript
public async find(instance: InstanceDto): Promise<Dto | null> {
  try {
    const result = await this.waInstance.findData();
    return result || null;
  } catch (error) {
    this.logger.error('Error finding data:', error);
    return null; // Evolution pattern: return null on error
  }
}
```

## Architecture Patterns

### Service Layer (Business Logic)
```typescript
export class ExampleService {
  private readonly logger = new Logger('ExampleService');
  
  public async create(instance: InstanceDto, data: ExampleDto) {
    return { example: { ...instance, data } };
  }
}
```

### Controller (Thin Layer)
```typescript
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}
  
  public async createExample(instance: InstanceDto, data: ExampleDto) {
    return this.exampleService.create(instance, data);
  }
}
```

### DTOs (No Decorators)
```typescript
export class ExampleDto {
  name: string;
  description?: string;
  enabled: boolean;
}
```

### Validation (JSONSchema7)
```typescript
export const exampleSchema: JSONSchema7 = {
  $id: v4(),
  type: 'object',
  properties: {
    name: { type: 'string' },
    enabled: { type: 'boolean' },
  },
  required: ['name', 'enabled'],
};
```

## Multi-Tenant Architecture

- **CRITICAL**: All operations scoped by `instanceName` or `instanceId`
- Database queries must include `where: { instanceId: ... }`
- Validate instance ownership before operations

## Testing Strategy

- Tests in `test/` directory as `*.test.ts`
- Mock external dependencies (WhatsApp APIs, databases)
- Focus on critical business logic in services

## Cursor/VSCode Rules

Additional rules exist in `.cursor/rules/`:
- `core-development.mdc` - Development principles
- `project-context.mdc` - Project-specific context
- `specialized-rules/` - Service, controller, DTO, guard, route patterns

## Security & Configuration

- **API key** authentication via `apikey` header
- **Input validation** with JSONSchema7
- **Rate limiting** on endpoints
- Never commit secrets - use `.env` files

## Language Requirements

- **User communication**: Portuguese (PT-BR)
- **Code/comments**: English
- **API responses**: English
- **Error messages**: Portuguese

## Commit Standards

Format: `type(scope): subject` (max 100 chars)
- Types: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert, security
- Use `npm run commit` for guided commits
