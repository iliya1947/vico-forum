-- Convert the old version-boundary/provenance recovery representation into
-- generation retention pools before the runtime stops using those registries.
-- No table or grant changes. Preserve edited_at: migration is not a user edit.
LOCK TABLE "forum_editor_drafts", "forum_attachment_draft_refs", "forum_attachment_draft_boundaries" IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
INSERT INTO "forum_attachment_draft_refs" ("attachment_id", "owner_id", "context_key", "draft_id", "created_at")
SELECT DISTINCT a.id, b.owner_id, b.context_key, b.draft_id, c.created_at
FROM "forum_attachment_draft_boundaries" b
JOIN "forum_editor_drafts" d ON d.owner_id=b.owner_id AND d.context_key=b.context_key AND d.draft_id=b.draft_id
CROSS JOIN LATERAL jsonb_array_elements_text(b.attachment_ids) selected(id)
JOIN "forum_attachment_draft_contexts" c ON c.attachment_id=selected.id AND c.owner_id=b.owner_id AND c.context_key=b.context_key
JOIN "forum_attachments" a ON a.id=c.attachment_id AND a.owner_id=c.owner_id
WHERE d.status='active' AND d.edited_at >= now()-interval '30 days'
  AND a.cleanup_status='active' AND a.verification_status='type-checked'
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "forum_editor_drafts" d
SET payload=jsonb_set(d.payload, '{draftAttachmentIds}', coalesce(
  d.payload->'draftAttachmentIds',
  (SELECT b.attachment_ids FROM "forum_attachment_draft_boundaries" b
   WHERE b.owner_id=d.owner_id AND b.context_key=d.context_key AND b.draft_id=d.draft_id AND b.version=d.version),
  (SELECT coalesce(jsonb_agg(r.attachment_id ORDER BY r.attachment_id), '[]'::jsonb)
   FROM "forum_attachment_draft_refs" r
   WHERE r.owner_id=d.owner_id AND r.context_key=d.context_key AND r.draft_id=d.draft_id)
)), version=d.version+1
WHERE d.status='active' AND d.edited_at >= now()-interval '30 days';
--> statement-breakpoint
DELETE FROM "forum_attachment_draft_boundaries";
