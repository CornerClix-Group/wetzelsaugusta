

## Fix Sign Out Button Visibility & Login Label

### Changes

**1. Sign Out button (`src/pages/Dashboard.tsx`, ~line 123-126)**
- The outline button on the dark navy sidebar has white text/border that's invisible. Change to `variant="ghost"` with explicit text styling:
  ```tsx
  <Button variant="ghost" size="sm" className="w-full text-sidebar-foreground hover:bg-sidebar-accent" ...>
  ```

**2. Index page (`src/pages/Index.tsx`, ~line 260)**
- Change "Manager Login" text to "Employee Login"

