# ueu-canvas

This is the source code for the [`@ueu/ueu-canvas`](https://www.npmjs.com/package/@ueu/ueu-canvas) npm package — a TypeScript library for interacting with the Canvas LMS API. It provides typed interfaces, data fetching utilities, and helpers for working with Canvas objects such as courses, enrollments, content items, terms, users, rubrics, and files.

The package is built with Webpack and TypeScript and publishes its compiled output from the `dist/` directory.

## What's in here

- **Courses** — fetch course data, manage blueprint courses, modules, sections, and course start dates
- **Content** — typed wrappers for Canvas content items: assignments, discussions, pages, and quizzes
- **Enrollments** — enrollment generators and role helpers
- **Terms** — term fetching and date parsing from term names
- **Users** — user generators
- **Fetch** — low-level utilities for paginated Canvas API requests (`getPagedDataGenerator`, `fetchJson`, typed GET/write configs)
- **Rubrics** — rubric and rubric association types and helpers
- **Files** — Canvas file types
- **Mocks** — mock data for testing

## Installation

```bash
npm install @ueu/ueu-canvas
```

## Build

```bash
npm run build
```

## Test

```bash
npx jest
```
