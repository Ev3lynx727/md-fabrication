import { z } from 'zod'

export const FabricateArgs = z.object({
  file: z.string(),
  voice: z.string().default('professional'),
  mode: z.string().default('default'),
  dryRun: z.boolean().default(false),
  apply: z.boolean().default(false),
  json: z.boolean().default(false),
  budget: z.coerce.number().int().positive().default(50000),
  session: z.boolean().default(false),
})

export const GraphArgs = z.object({
  directory: z.string(),
  json: z.boolean().default(false),
})

export const OrphansArgs = z.object({
  directory: z.string(),
  json: z.boolean().default(false),
})

export const ImageMapArgs = z.object({
  directory: z.string(),
  json: z.boolean().default(false),
})

export const BacklinksArgs = z.object({
  doc: z.string(),
  directory: z.string(),
  json: z.boolean().default(false),
})

export const AssembleArgs = z.object({
  directory: z.string(),
  voice: z.string().optional(),
  dryRun: z.boolean().default(false),
  apply: z.boolean().default(false),
  trilogy: z.boolean().default(false),
  enhance: z.boolean().default(false),
  json: z.boolean().default(false),
})

export const LintArgs = z.object({
  directory: z.string(),
  json: z.boolean().default(false),
})

export const EditDocsArgs = z.object({
  directory: z.string(),
  json: z.boolean().default(false),
})

export const UpdateIndexArgs = z.object({
  directory: z.string(),
  json: z.boolean().default(false),
})

export const UpdateLogArgs = z.object({
  directory: z.string(),
  action: z.string(),
  description: z.string(),
  json: z.boolean().default(false),
})

export const LinkUpArgs = z.object({
  directory: z.string(),
  json: z.boolean().default(false),
})

export const GatherArgs = z.object({
  directory: z.string(),
  json: z.boolean().default(false),
})

export const IngestArgs = z.object({
  file: z.string(),
  target: z.string().optional(),
  json: z.boolean().default(false),
})

export const SessionArgs = z.object({
  budget: z.coerce.number().int().positive().default(50000),
  json: z.boolean().default(false),
})

export type FabricateOptions = z.infer<typeof FabricateArgs>
export type AssembleCliOptions = z.infer<typeof AssembleArgs>
