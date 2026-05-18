// Type declarations for swagger-ui-react CSS side-effect import.
// swagger-ui-react ships its own CSS file but does not provide TS type declarations for it.
// Without this, TypeScript's strict mode rejects the side-effect import
// `import 'swagger-ui-react/swagger-ui.css'` in src/app/api-docs/page.tsx.
declare module 'swagger-ui-react/swagger-ui.css'
