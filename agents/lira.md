# agents/lira.md — B7-B5a pending duplicate-submit guard authored; STOP

- Accepted B6 #370 exact `51a9ebe03f16c438faae5bec99a5856287630958`; Draft B7 #371 exact `74b84dc2176b64e18d2f2e056012305121adeb56`, base unchanged, unmerged/behind0.
- Prior B7-A/B1a/B1b/B2a/B2b/B3a/B3b/B3c/B4a/B4b/B4c authored. B4a 409 manual refresh; B4b 401/403 one permission GET; B4c 503/500/unknown requires explicit GET, no replay. Earlier B7 runtime not executed.
- **B7-B5a:** Hide/Restore forms reject duplicate same-turn/in-flight POST synchronously with per-snapshot `submittedInCurrentSnapshot` ref and `preventDefault`, not only disabled button/fetcher state. Fence cleared after explicit successful loader GET if unchanged snapshot persists; confirmed success blocked, reason retained, `aria-busy` and EN/RU/HE `visibilityPending` status added. No server contract changes, optimistic success or rebase.
- `app/admin/visibility-pending.test.tsx` adds 5 mounted tests (Hide/Restore × topic/post delayed action and one localization fingerprint). Tests authored, NOT run. Source fingerprint `e6a54d3815edee43655aef180f6914ad2b707cf23483a01bccfa488c0f9b7a60`.
- B7-B5a exact `74b84dc2176b64e18d2f2e056012305121adeb56` vs B4c `b6e58cb94b1a3d21410d55d560e1dd3c8214f253`: 6 commits/6 files/behind0; 22/22 structural checks PASS. **Vitest/real PG/Chromium/full CI NOT run.**
- **STOP.** Next owner `...`: only B7-B5b actor switch/permission revoke and late in-flight response. Check actual auth/fetcher/loader lifecycle first. No B8/B9/fold/merge/deploy.
