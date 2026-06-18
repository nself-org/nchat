/**
 * Purpose:    "/api-docs" — REST API reference. Faithful port of the legacy
 *             frontend/src/app/api-docs/page.tsx (which rendered swagger-ui-react against
 *             /openapi.yaml). swagger-ui-react is not a frontend-vite dependency, so this ports
 *             the SAME behavior (fetch the OpenAPI spec asset → loading / error / rendered states)
 *             via the dependency-free OpenApiViewer, preserving every state the legacy page had.
 * Inputs:     none. Spec resolved from the static asset (default /openapi.json).
 * Outputs:    Full-height OpenAPI documentation surface.
 * Constraints:Client-only. The spec is a static build asset; once a real /openapi.json is shipped
 *             to public/ the page renders live operations (see backend_pending). Slate theme.
 * SOT:        F-NCHAT-VITE-ROUTE — /api-docs
 */
import { OpenApiViewer } from '@/components/devtools/OpenApiViewer'

export default function ApiDocsPage() {
  return (
    <div className="min-h-full bg-slate-950 px-6 py-8 text-slate-200">
      <div className="mx-auto max-w-5xl">
        <OpenApiViewer specUrl="/openapi.json" />
      </div>
    </div>
  )
}
