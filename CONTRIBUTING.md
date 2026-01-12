# Contributing to VEdit

Thank you for your interest in contributing to VEdit! This document provides guidelines for contributing.

## Development Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Getting Started

```bash
# Clone the repository
git clone https://github.com/your-username/vedit.git
cd vedit

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173).

## Development Workflow

### Code Style

This project uses ESLint and Prettier for code formatting:

```bash
# Check for linting issues
npm run lint

# Format code
npm run format

# Check formatting without writing
npm run format:check
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

### Building

```bash
# Type-check the project
npm run typecheck

# Build for production
npm run build

# Preview production build
npm run preview
```

## Pull Request Process

1. **Fork** the repository and create a feature branch
2. **Make changes** following the code style guidelines
3. **Write/update tests** for your changes
4. **Run checks** before submitting:
   ```bash
   npm run lint && npm run typecheck && npm test
   ```
5. **Submit a PR** with a clear description

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Adding/updating tests
- `chore:` Maintenance tasks

Example: `feat: add video speed control`

## Reporting Issues

- Use the issue templates when available
- Include browser version and OS
- Provide steps to reproduce bugs
- For feature requests, explain the use case

## Questions?

Feel free to open a [Discussion](https://github.com/your-username/vedit/discussions) for questions.
