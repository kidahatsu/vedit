---
description: Steps to create a new UI component in VEdit.
---

# Workflow: Create New Component

Follow these steps when adding a new React component to `src/components/`.

1.  **Create Directory**: Create a folder `src/components/[ComponentName]/`.
2.  **Create Component File**: Create `[ComponentName].tsx`.
    - Use Functional Components with TypeScript interfaces for props.
    - `export const ComponentName = ...` (Named export preferred over default).
3.  **Create Styles**: If custom styles are needed, create `[ComponentName].module.css`.
    - Import as `import styles from './ComponentName.module.css'`.
4.  **Create Test**: Create `[ComponentName].test.tsx`.
    - Use `@testing-library/react` and `vitest`.
    - Basic render test is mandatory.
5.  **Export**: Add the component to `src/components/index.ts` (if a barrel file exists, otherwise skip).

## Example Template

```tsx
import React from 'react';
import styles from './MyComponent.module.css';

interface MyComponentProps {
  label: string;
}

export const MyComponent: React.FC<MyComponentProps> = ({ label }) => {
  return <div className={styles.container}>{label}</div>;
};
```
