# Email Campaign Composer — Scope

**Date:** 2026-08-10  
**Repo:** `admindashboard`  
**Related:** Email Campaigns (`/dashboard/settings/email-broadcasts`)

This document scopes the full **EMAIL CAMPAIGN COMPOSER** product requirements against what is already shipped (Bimal WhatsApp feedback / v0), and proposes phased delivery.

---

## Current baseline (v0) — keep

Already usable for staff:

- Compose subject + HTML (textarea)
- Audience: **All eligible players** / **Selected (specific) players**
- Filters: deposit min/max, SSN verified/unverified, states
- Save/reuse campaign templates + history **Reuse template**
- Send now / schedule
- Basic sandboxed preview + placeholder chips

Treat this as **v0**. Do not rip it out while building the full composer.

### v0 coverage vs full PRD

Roughly **20–25%** of the full composer PRD is implemented. v0 matches the urgent feedback set (templates, deposit/SSN/state, remove header/banner, remove whitelabel, reuse template) — not the brand-level composer product.

---

## Full PRD summary (target)

Provide a simple brand-level UI for staff to compose an HTML email and send it to:

1. One or multiple **specific players**
2. **Filtered players**
3. **All eligible players** in the current brand

Required product pieces:

1. Composer layout (Email details → Recipients → HTML editor → Preview → Actions)
2. Recipient selection (Specific / Filtered / All)
3. Email eligibility + automatic exclusions (with visible reasons)
4. HTML editor + desktop/mobile preview
5. Validation rules
6. Recipient count + review screen
7. Draft restore, recount on filter change, double-submit prevention

---

## Recommended phases

### Phase 1 — Composer shell + review flow

**Goal:** Match the PRD action model without rebuilding the full filter matrix yet.  
**Highest product value for next ship.**

| Include | Skip for now |
| --- | --- |
| Dedicated composer **page** (or full-height flow) with sections: Details → Recipients → HTML → Preview → Actions | Full 11-filter builder |
| **Internal email name** (required) + subject + HTML | Monaco / CodeMirror |
| Recipient tabs: Specific / Filtered / All (Filtered = current deposit / SSN / state block for now) | Full filter operator matrix |
| **Save Draft** + **Review & Send** + Back to Edit + Send | Live matched / excluded counts unless BE ready |
| Review summary (name, subject, method, final count if BE returns it) | — |
| Typed `SEND` confirmation for **All Eligible Players** | — |
| Double-submit lock + sending state | Marketing exclusion reason UI |

**Backend dependencies**

- Draft CRUD (`status: draft`) or equivalent
- Create / send from draft
- Optional recipient preview count

**Estimate:** ~1–1.5 weeks FE if draft endpoints exist; longer if inventing draft storage.

---

### Phase 2 — Specific Players UX to PRD

| Include |
| --- |
| Searchable multi-select (username or email only); search menu stays open after add |
| Removable chips + Clear All + selected count |
| **View Selected** table (email, Remove) for larger selections |
| Prevent duplicates |
| Drop “paste user IDs” or keep as power-user secondary only |

**Backend dependencies:** Little new (existing player search).

**Estimate:** ~2–4 days.

---

### Phase 3 — Filtered Players (real filter builder)

This is the **largest** chunk.

#### Phase 3 MVP (shippable subset)

1. Match mode **AND** (OR later)
2. Filter rows: field + operator + value + remove
3. Live count API: matched / excluded / final
4. Implement filters that map cleanly to existing player APIs first:
   - Account status (Active / Inactive)
   - Email verification (Verified / Not verified)
   - KYC status (Verified / Rejected / Pending / Not submitted)
   - First purchase (Completed / Not completed)
   - Total purchase amount (Greater than / Less than / Between) — can replace current deposit_min / deposit_max
   - Marketing eligibility (Eligible / Not eligible), if field exists

#### Phase 3b (defer)

- Registration date, last active date, last purchase date (Before / After / Between / Last X days / Never)
- Number of purchases
- Current balance
- Full **OR** match mode
- Per-player exclusion reason breakdown

**Backend dependencies**

- Filter query + count endpoint returning something like:

```json
{
  "matched": 4820,
  "excluded": 186,
  "final": 4634,
  "exclusion_reasons": []
}
```

**Do not start FE filter UI until this contract is agreed.**

**Estimate:** 2–3 weeks with BE; FE alone cannot fake accurate counts.

---

### Phase 4 — Eligibility / exclusions UI

| Include |
| --- |
| Show auto-excluded count + reasons (unsubscribed, invalid email, permanent bounce, spam complaint, suppressed / blocked) |
| Apply to Specific / Filtered / All |
| No staff override for promotional sends |
| View Recipients for All Eligible |

**Backend dependencies:** Exclusion taxonomy in count / preview responses.

**Estimate:** ~1 week after Phase 3 count API.

---

### Phase 5 — Editor + preview polish

| Include |
| --- |
| Monaco or CodeMirror (syntax highlight, line numbers, search/replace, Format HTML, fullscreen) |
| Desktop + Mobile preview + Refresh Preview |
| Sample-variable preview (partially exists) |
| Reject unsupported variables; reject missing required variables |
| Disable Review & Send until blocking validation errors are resolved |

**Estimate:** ~1–1.5 weeks (mostly FE).

---

## Out of scope for “finalize email campaigns soon”

- Image upload into HTML body (explicitly deferred; staff paste Drive/CDN links in HTML)
- Whitelabel audience option (removed from UI)
- Superadmin cross-brand composer
- Non-promotional / transactional composer (separate Email Templates settings)

---

## Suggested ship cuts

### v1 (recommended near-term)

**Phase 1 + Phase 2 only**

- Proper composer flow (draft + review + typed SEND for All)
- Better Specific Players UX
- Keep current deposit / SSN / state as temporary “Filtered” tab content

**PRD coverage after v1:** ~25% → ~55%

### v1.5

- Phase 3 MVP filters + live counts

### v2

- Phase 4 exclusions UI
- Phase 5 Monaco + desktop/mobile preview

**PRD coverage after v1.5–v2:** ~80%+

---

## Requirement coverage checklist

| Area | v0 today | Target phase |
| --- | --- | --- |
| Composer page layout (ordered sections) | Partial (drawer) | Phase 1 |
| Internal email name | Partial (template name) | Phase 1 |
| Subject + HTML | Done | — |
| Save Draft / Review & Send / Back to Edit | Missing | Phase 1 |
| Specific / Filtered / All tabs | Partial (All + Specific) | Phase 1 shell, Phase 3 filters |
| Specific Players multi-select UX | Partial | Phase 2 |
| Filter builder + AND/OR | Missing | Phase 3 |
| Eleven required filters | ~1–2 of 11 | Phase 3 / 3b |
| Live matched / excluded / final counts | Missing | Phase 3 |
| Auto exclusions with visible reasons | Missing (BE may silent-exclude) | Phase 4 |
| Monaco / desktop+mobile preview | Missing (textarea + one iframe) | Phase 5 |
| Review screen + SEND confirm for All | Missing | Phase 1 |
| Double-submit prevention | Partial (`isSaving`) | Phase 1 |
| Reuse prior campaign into compose | Done | — |
| Save campaign templates | Done | — |

---

## Decisions needed

1. **v1 cut:** Phase 1+2 only, or also force Phase 3 MVP?
2. **Drafts:** Does BE already support draft campaigns, or FE-only local draft for now?
3. **Filtered:** Keep current 3 criteria as “Filtered” until the 11-filter API exists?
4. **Page vs drawer:** Prefer full `/dashboard/settings/email-campaigns/compose` page for this PRD?
5. **Timeline:** This week, ~2 weeks, or a proper multi-milestone plan?

---

## Next step

Once the five decisions above are answered, turn this into a concrete ticket list with FE/BE split and acceptance criteria per phase.

---

## Implementation progress

### Started 2026-08-10 — Phase 1 + Phase 2 (done)

Shipped in FE:

- Composer page: `/dashboard/settings/email-broadcasts/compose`
- Sections: Email details → Recipients → HTML + Preview → Actions
- Recipient methods: Specific / Filtered / All
- Specific Players multi-select (search stays open, chips, View Selected table, Clear All)
- Save Draft (localStorage + campaign template when API available)
- Review & Send / Back to Edit / Send Email
- Typed `SEND` confirmation for All Eligible Players
- Desktop / Mobile preview + Refresh Preview
- Campaigns list Compose / Use / Reuse → composer page

### Started 2026-08-10 — Phase 3 MVP (done on FE)

- Filter builder: field + operator + value rows, Add/Remove
- Match mode AND/OR (OR forwarded; send mapping uses supported flat fields)
- All 11 PRD filters (+ SSN + State) defined in UI
- Live matched count estimate via players list for supported filters
- Send maps purchase amount / SSN / state to current broadcast payload
- Unsupported filters flagged in preview (need BE for full send/count)

### Started 2026-08-10 — Phase 5 (done on FE)

- Monaco HTML editor (`@monaco-editor/react`) with line numbers + syntax highlight
- Find / Replace (Monaco), Format HTML (`js-beautify`), Full screen mode
- Variable chips insert at cursor
- Desktop / Mobile preview + Refresh Preview (already present)
- Reject unsupported `{{ variables }}` before Review & Send

Still deferred: dedicated recipient-count API with auto-exclusion breakdown (Phase 4).
