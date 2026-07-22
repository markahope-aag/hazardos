'use client'

/**
 * Dependency-free OpenAPI 3 renderer.
 *
 * This replaced swagger-ui-react, which was the only thing pulling immutable
 * 3.8.3 into the tree (GHSA-v56q-mh7h-f735 / GHSA-xvcm-6775-5m9r, no fix
 * available on the 3.x line). It renders the same spec object we already ship
 * from lib/openapi/openapi-spec.ts, so there is no fetch and no second source
 * of truth.
 *
 * Collapsing uses native <details>/<summary> rather than component state:
 * keyboard and screen-reader behaviour come for free, and the page renders
 * fully without hydration.
 */

// Minimal structural types. The spec is a plain object literal rather than a
// typed document, so these describe only what the viewer actually reads.
type Ref = { $ref?: string }

type SchemaLike = Ref & {
  type?: string
  format?: string
  enum?: unknown[]
  items?: SchemaLike
  properties?: Record<string, SchemaLike>
  required?: string[]
  description?: string
  example?: unknown
}

type Parameter = {
  name?: string
  in?: string
  required?: boolean
  description?: string
  schema?: SchemaLike
}

type MediaType = { schema?: SchemaLike }

type Operation = {
  operationId?: string
  summary?: string
  description?: string
  tags?: string[]
  deprecated?: boolean
  parameters?: Parameter[]
  requestBody?: { required?: boolean; description?: string; content?: Record<string, MediaType> }
  responses?: Record<string, { description?: string; content?: Record<string, MediaType> }>
  security?: unknown[]
}

type OpenApiDocument = {
  info?: { title?: string; version?: string; description?: string }
  servers?: { url?: string; description?: string }[]
  tags?: { name?: string; description?: string }[]
  paths?: Record<string, Record<string, Operation>>
  components?: { schemas?: Record<string, SchemaLike> }
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const
type Method = (typeof METHODS)[number]

// Colours mirror the conventional Swagger palette so the page stays familiar
// to anyone who used the old one.
const METHOD_STYLES: Record<Method, string> = {
  get: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/30',
  post: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-emerald-500/30',
  put: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/30',
  patch: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 ring-teal-500/30',
  delete: 'bg-red-500/10 text-red-700 dark:text-red-300 ring-red-500/30',
  head: 'bg-muted text-muted-foreground ring-border',
  options: 'bg-muted text-muted-foreground ring-border',
}

/** `#/components/schemas/Customer` -> `Customer` */
function refName(ref: string): string {
  return ref.split('/').pop() || ref
}

/**
 * One-line type label for a schema. Refs are shown by name rather than
 * expanded — the schema itself is listed once under Schemas, so inlining it at
 * every use site would bury the endpoint list.
 */
function typeLabel(schema?: SchemaLike): string {
  if (!schema) return 'any'
  if (schema.$ref) return refName(schema.$ref)
  if (schema.type === 'array') return `${typeLabel(schema.items)}[]`
  if (schema.enum?.length) return schema.enum.map((v) => JSON.stringify(v)).join(' | ')
  if (schema.format) return `${schema.type ?? 'string'} <${schema.format}>`
  return schema.type ?? 'object'
}

function MethodBadge({ method }: { method: Method }) {
  return (
    <span
      className={`inline-block shrink-0 rounded px-2 py-0.5 font-mono text-xs font-bold uppercase ring-1 ring-inset ${METHOD_STYLES[method]}`}
    >
      {method}
    </span>
  )
}

function ParameterTable({ parameters }: { parameters: Parameter[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-left text-sm">
        <thead>
          <tr className="border-b text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">In</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {parameters.map((p, i) => (
            <tr key={`${p.name}-${i}`} className="border-b border-border/50 last:border-0 align-top">
              <td className="py-2 pr-4 font-mono text-xs">
                {p.name}
                {p.required && <span className="ml-1 text-red-600 dark:text-red-400">*</span>}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">{p.in}</td>
              <td className="py-2 pr-4 font-mono text-xs text-muted-foreground">{typeLabel(p.schema)}</td>
              <td className="py-2 text-muted-foreground">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function BodySchema({ content }: { content?: Record<string, MediaType> }) {
  const entries = Object.entries(content ?? {})
  if (entries.length === 0) return null

  return (
    <div className="space-y-2">
      {entries.map(([mediaType, media]) => (
        <div key={mediaType}>
          <p className="font-mono text-xs text-muted-foreground">{mediaType}</p>
          <SchemaBlock schema={media.schema} />
        </div>
      ))}
    </div>
  )
}

/** Property list for an inline object schema; falls back to the type label. */
function SchemaBlock({ schema }: { schema?: SchemaLike }) {
  if (!schema) return null

  const properties = schema.type === 'array' ? schema.items?.properties : schema.properties
  const required = new Set((schema.type === 'array' ? schema.items?.required : schema.required) ?? [])

  if (!properties) {
    return <p className="font-mono text-xs">{typeLabel(schema)}</p>
  }

  return (
    <ul className="mt-1 space-y-1 rounded-md bg-muted/50 p-3">
      {Object.entries(properties).map(([name, prop]) => (
        <li key={name} className="text-xs">
          <span className="font-mono font-medium">{name}</span>
          {required.has(name) && <span className="ml-1 text-red-600 dark:text-red-400">*</span>}
          <span className="ml-2 font-mono text-muted-foreground">{typeLabel(prop)}</span>
          {prop.description && <span className="ml-2 text-muted-foreground">— {prop.description}</span>}
        </li>
      ))}
    </ul>
  )
}

function OperationRow({ method, path, operation }: { method: Method; path: string; operation: Operation }) {
  const hasDetail =
    (operation.parameters?.length ?? 0) > 0 ||
    operation.requestBody !== undefined ||
    Object.keys(operation.responses ?? {}).length > 0 ||
    Boolean(operation.description)

  return (
    <details className="group border-b border-border/60 last:border-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 hover:bg-muted/50">
        <MethodBadge method={method} />
        <code className="min-w-0 break-all font-mono text-sm">{path}</code>
        {operation.deprecated && (
          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-700 dark:text-amber-300">
            deprecated
          </span>
        )}
        <span className="ml-auto hidden truncate text-sm text-muted-foreground sm:block">{operation.summary}</span>
      </summary>

      {hasDetail && (
        <div className="space-y-4 border-t bg-muted/20 px-4 py-4">
          {operation.description && (
            <p className="whitespace-pre-line text-sm text-muted-foreground">{operation.description}</p>
          )}

          {operation.parameters && operation.parameters.length > 0 && (
            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Parameters</h4>
              <ParameterTable parameters={operation.parameters} />
            </section>
          )}

          {operation.requestBody && (
            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Request body{operation.requestBody.required ? ' (required)' : ''}
              </h4>
              <BodySchema content={operation.requestBody.content} />
            </section>
          )}

          {operation.responses && Object.keys(operation.responses).length > 0 && (
            <section>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Responses</h4>
              <ul className="space-y-1">
                {Object.entries(operation.responses).map(([status, response]) => (
                  <li key={status} className="flex gap-3 text-sm">
                    <code
                      className={`font-mono font-semibold ${
                        status.startsWith('2')
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : status.startsWith('4')
                            ? 'text-amber-700 dark:text-amber-300'
                            : status.startsWith('5')
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-muted-foreground'
                      }`}
                    >
                      {status}
                    </code>
                    <span className="text-muted-foreground">{response.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </details>
  )
}

export function OpenApiViewer({ spec }: { spec: unknown }) {
  const doc = spec as OpenApiDocument

  // Group operations by their first tag, preserving the order tags are
  // declared in the spec so the page reads the way the spec author intended.
  const groups = new Map<string, { method: Method; path: string; operation: Operation }[]>()
  for (const tag of doc.tags ?? []) {
    if (tag.name) groups.set(tag.name, [])
  }

  for (const [path, pathItem] of Object.entries(doc.paths ?? {})) {
    for (const method of METHODS) {
      const operation = pathItem[method]
      if (!operation) continue
      const tag = operation.tags?.[0] ?? 'Other'
      if (!groups.has(tag)) groups.set(tag, [])
      groups.get(tag)!.push({ method, path, operation })
    }
  }

  const tagDescriptions = new Map((doc.tags ?? []).map((t) => [t.name, t.description]))
  const populated = [...groups.entries()].filter(([, ops]) => ops.length > 0)
  const operationCount = populated.reduce((n, [, ops]) => n + ops.length, 0)
  const schemas = Object.entries(doc.components?.schemas ?? {})

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold">{doc.info?.title ?? 'API Reference'}</h1>
          {doc.info?.version && (
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-sm text-muted-foreground">
              v{doc.info.version}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {operationCount} endpoints across {populated.length} groups
        </p>
        {doc.servers && doc.servers.length > 0 && (
          <ul className="flex flex-wrap gap-2 pt-1">
            {doc.servers.map((s) => (
              <li key={s.url} className="rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
                {s.url}
              </li>
            ))}
          </ul>
        )}
      </header>

      {doc.info?.description && (
        <details className="rounded-lg border">
          <summary className="cursor-pointer list-none px-4 py-3 font-medium hover:bg-muted/50">Overview</summary>
          <div className="border-t px-4 py-4">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-muted-foreground">
              {doc.info.description.trim()}
            </pre>
          </div>
        </details>
      )}

      {populated.map(([tag, operations]) => (
        <section key={tag} className="space-y-2">
          <div>
            <h2 className="text-xl font-semibold">{tag}</h2>
            {tagDescriptions.get(tag) && (
              <p className="text-sm text-muted-foreground">{tagDescriptions.get(tag)}</p>
            )}
          </div>
          <div className="overflow-hidden rounded-lg border">
            {operations.map(({ method, path, operation }) => (
              <OperationRow key={`${method}-${path}`} method={method} path={path} operation={operation} />
            ))}
          </div>
        </section>
      ))}

      {schemas.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xl font-semibold">Schemas</h2>
          <div className="overflow-hidden rounded-lg border">
            {schemas.map(([name, schema]) => (
              <details key={name} className="border-b border-border/60 last:border-0">
                <summary className="cursor-pointer list-none px-4 py-3 font-mono text-sm hover:bg-muted/50">
                  {name}
                </summary>
                <div className="border-t bg-muted/20 px-4 py-3">
                  {schema.description && <p className="mb-2 text-sm text-muted-foreground">{schema.description}</p>}
                  <SchemaBlock schema={schema} />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
