# Combined editor preview

This branch is an isolated preview based on `feature/flexible-page-builder`.

It retains the legacy visual editor shell and the Page Builder implementation in the same application. The legacy editor is the default view; the Page Builder is opened from the `Page builder` control in the top bar.

No production deployment, main branch, or existing backup branch is changed by this preview.

Manual verification required: confirm both modes open, switch between them, add/edit/reorder blocks, save a local draft, reload, and verify the draft persists. Publishing and server-side synchronization are not included.
