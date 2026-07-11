# GCF Website: Research Integration Audit

Internal working doc (not for publication). Opportunities to surface the tokenizer-attention coupling research on the GCF website. Only 2 of 22 site pages currently reference the research, which is GCF's single biggest differentiator over TOON.

> **CRITICAL CORRECTION before using this:** The papers are on Zenodo (preprint archive), NOT peer-reviewed. Never write "peer-reviewed" on the site. Use "published research with DOIs" or "reproducible research program." Peer review comes with the arXiv/venue path.

> **FRAMING CORRECTION (whitepaper v9, Section 2.0):** Do NOT frame GCF as "designed from the model's perspective" or "reverse-engineered from three papers." The honest sequence is co-evolution: the grammar was CHOSEN FROM TOKENIZATION EXPERIMENTS and validated on production models; the three attention-level papers came AFTERWARD and independently confirmed why its choices work (after-the-fact confirmation is the stronger evidence, because it cannot be dismissed as motivated reasoning). Keep two layers distinct: tokenization experiments (design-time input that informed the grammar) vs attention-level analysis (the three papers, later validation). Never claim GCF was chosen with zero tokenizer knowledge, and never claim the papers were the design source. The proposals below have been updated to this framing.

## Top opportunities (priority order)

### 1. Format Overview: justify the delimiter choice mechanistically (HIGHEST IMPACT)
- **File:** `docs/guide/format-overview.md` (~line 41-42)
- **Now:** "Pipe separator with no spaces maximizes density" — no justification
- **Add:** The pipe was chosen from tokenization experiments and confirmed by the 43-tokenizer scan: pipe merges at 0.47% vs JSON quote 8.17% vs TOON tab 32.91%. Reference Tokenizer-Attention Coupling (DOI 10.5281/zenodo.20925910). "The choice is not aesthetic, it's measured."
- **Why:** Grounds the pipe choice in measurement (chosen from tokenization experiments, confirmed by the scan), not aesthetics. Strongest single differentiator.

### 2. vs-TOON: ground comprehension wins in mechanism
- **File:** `docs/guide/vs-toon.md` (after ~line 243)
- **Add:** "The Mechanistic Proof" subsection. Controlled experiments across two architectures show merge barriers enable 4x more delimiter attention (14% to 54%). TOON has no mechanistic explanation for why it loses; GCF does.

### 3. Dedicated "The Science" / research-backing page
- **File:** new `docs/guide/research-backing.md`
- **Structure:** opening (the format was chosen from tokenization experiments and shipped; three companion papers later reverse-engineered why it works), one section per paper (coupling / stranded / atlas), "How the research confirmed GCF's choices" (pipe, section headers, local IDs, positional fields), evidence section with 3 Zenodo DOIs, "what this means for users." Note the co-evolution keystone: GCF was used as the clean-delimiter reference instrument in the stranded-attention study, so the format predated the theory closely enough to be its probe.
- **Why:** centralizes research in one discoverable place.

### 4. Benchmarks: explain WHY comprehension fails
- **File:** `docs/guide/benchmarks.md` (~line 79-83)
- **Add:** mechanistic grounding. Delimiter merging breaks attention at scale; clean boundaries fix it. Reference coupling + stranded papers.

### 5. Sidebar "The Science" section
- **File:** `docs/.vitepress/config.ts` (after ~line 68)
- **Add:** sidebar section linking all three Zenodo papers + the research-backing page.

### 6. Format Overview: design-element-to-research table
- **File:** `docs/guide/format-overview.md` (~line 22)
- **Add:** "Chosen from tokenization experiments, confirmed by attention-level analysis" table mapping each design element (pipe, section headers, local IDs, positional fields, inline nesting) to the later research finding that independently confirmed it. The table (element to finding) is fine; keep the framing verb as "confirmed by," never "designed from."

### 7. LLM Integration: link companion research
- **File:** `docs/guide/llm-integration.md` (after ~line 33)
- **Add:** links to all three papers with one-line finding summaries.

## Rejected suggestions
- DOIs in the nav bar text ("Whitepaper (DOI: ...)") — clunky, hurts nav readability. Skip.
- "Enterprise buyer / durable technology" framing — marketing fluff, doesn't fit the HUD-aesthetic credibility-first site.

## DOIs
- Coupling: 10.5281/zenodo.20925910
- Stranded: 10.5281/zenodo.21158886
- Atlas: 10.5281/zenodo.21205389
- GCF whitepaper: 10.5281/zenodo.20579817

## Note on scope
Site changes cascade (per CLAUDE.md, encoding/positioning changes ripple across spec, docs, playground). This is a multi-file writing effort. Not urgent. Do when rested.
