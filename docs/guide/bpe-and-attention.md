# BPE and Attention: How Tokenization Shapes What a Model Can See

A first-principles explainer of Byte-Pair Encoding, the structural blind spot it creates, and why that blind spot permanently constrains transformer attention. This is the science behind GCF, written to stand on its own.

Everything below is drawn from three companion research papers by Dayna Blackwell (Blackwell Systems): [Tokenizer-Attention Coupling](https://doi.org/10.5281/zenodo.20925910), [Stranded Attention](https://doi.org/10.5281/zenodo.21158886), and the [Developmental Atlas of Attention Head Specialization](https://doi.org/10.5281/zenodo.21205389). For the GCF-specific data (the 43-tokenizer study, savings tables, comprehension failure taxonomy), see [Tokenizer Analysis](/guide/tokenizer-analysis).

## 1. What BPE Is, From First Principles

Before a language model sees text, a tokenizer converts that text into a sequence of integers. The tokenizer is a fixed lookup table: it maps strings to integer IDs and back. Almost every production LLM (the GPT family, Llama, Mistral, Qwen, DeepSeek, Gemma) builds this table with a method called Byte-Pair Encoding, or BPE (Sennrich, Haddow, and Birch, 2016).

BPE was designed to solve a problem in machine translation: how to represent an open vocabulary (any word, including rare and unseen ones) with a fixed, manageable set of tokens. Its answer is elegant and worth understanding in full, because everything that follows is a consequence of it.

### The algorithm

BPE starts with the smallest possible units and merges upward.

1. **Start with bytes.** Every piece of text is a sequence of individual characters (more precisely, bytes). At this stage the vocabulary is tiny: just the set of single bytes. The word `token` is six separate units: `t`, `o`, `k`, `e`, `n`.

2. **Count adjacent pairs.** Scan the entire training corpus and count how often each adjacent pair of units occurs. In English text, the pair `t` + `h` is extremely common (`the`, `this`, `that`, `with`). The pair `q` + `z` is essentially never seen.

3. **Merge the most frequent pair.** Take the single most frequent pair and add it to the vocabulary as one new unit. Every occurrence of that pair in the corpus is now treated as the merged unit. `t` + `h` becomes `th`.

4. **Repeat.** Recount pairs (now including the newly merged units), merge the next most frequent, and continue. `th` + `e` might merge into `the`. Common words gradually assemble themselves from the bottom up: bytes into pairs, pairs into fragments, fragments into whole words.

5. **Stop at a target size.** The process runs until the vocabulary reaches a chosen size (typically 32,000 to 262,000 entries, depending on the model). The final vocabulary is a frozen table.

The result is a compression scheme tuned to the training corpus. Common words become single tokens; rare words break into a few subword pieces; truly novel strings fall back to individual bytes. Nothing is ever out of vocabulary, and common text is short.

### Encoding is deterministic

At inference time, tokenization is not a decision. It is a lookup. The tokenizer applies its learned merge rules in a fixed priority order, merging the highest-priority pair first and repeating until no more apply. If the string `token` exists in the vocabulary as entry #4177, the tokenizer always selects it as one token. There is no context, no probability, no learned judgment. If the entry exists, it wins, every time.

This determinism is the crucial property. It means that whatever the tokenizer's training left in the vocabulary is fixed forever. And it means that the shape of every input the model ever sees is decided before the model does any work at all.

### Grammar versus payload

Any structured format contains two kinds of characters. **Grammar symbols** are the delimiters that mark structure: in JSON, these are `"`, `:`, `,`, `{`, `}`, `[`, `]`. **Payload content** is the actual data: field names like `name`, values like `Alice`. The grammar repeats on every record; the payload varies.

BPE knows nothing about this distinction. It sees only byte pairs and their frequencies. And that is exactly where the trouble begins.

## 2. The Blind Spot

Structural delimiters do not appear randomly. They appear immediately next to content, at very high frequency, in extremely consistent patterns. In a JSON corpus, the byte `"` is almost always followed by a field name: `"name`, `"id`, `"type`, `"value`. Those pairs occur billions of times in web-scraped training data (`name` alone is the single most common JSON property on the web, per the Web Data Commons project at the University of Mannheim, with 3.5 billion occurrences).

To BPE, a delimiter fused to its neighbor is just another frequent pair. So BPE merges it. The quote in `"name"` becomes part of a single token, `"name`, which exists as vocabulary entry #32586 in GPT-4. The tokenizer then produces:

```
"value":"pending"

GPT-4:   ["value] [":"] [pending] ["]    (4 tokens, quote fused into content)
Claude:  ["] [value] [":"] [pending] ["]  (5 tokens, quote isolated)
```

The structural boundary (where the field name begins) sits at a different token position depending on which model reads the data. On GPT-4 the opening quote has disappeared into the content token; on Claude it stands alone. This is not a rare edge case. The most common JSON field names merge with the opening quote on roughly 30% of production tokenizers.

Some vocabulary entries fuse multiple grammar operations at once. The token `":"` packs three structural operations (close a string, separate a key from a value, open a string) into a single integer. The token `":{"` packs four. The model receives one token where a parser would make four decisions.

### The 43-tokenizer merge rates

To measure how universal this is, the tokenizer-attention-coupling study analyzed 43 tokenizers from 20 providers (OpenAI, Anthropic, Meta, Google, Mistral, Alibaba, DeepSeek, Microsoft, and more), with vocabulary sizes from 32K to 262K. It measured how often each format's delimiter fuses with adjacent content on real evaluation data:

| Format | Delimiter | Merge rate |
|--------|-----------|-----------|
| GCF | pipe (`\|`) | **0.47%** |
| JSON | quote (`"`) | **8.17%** |
| TOON | tab (`\t`) | **32.91%** |

The pipe almost never merges. The quote merges on roughly one in twelve boundaries. The tab (used by TOON, a competing token-efficient format) merges on a third of all boundaries measured, and on GPT-4o's tokenizer, the tab merges on 100% of the words tested. Tab-separated data was so common in tokenizer training corpora (TSV files, log output, terminal formatting) that GPT-4's cl100k vocabulary contains 1,173 distinct tab-plus-letter entries.

There is a paradox worth naming: the more of a format a tokenizer saw during training, the more aggressively it merged that format's delimiters, and the more boundaries it hid. "Trained on lots of JSON" is not an advantage for structural comprehension. It is the mechanism that creates the ambiguity. The tokenizer's compression efficiency is the model's structural handicap.

The full per-character, per-tokenizer breakdown (including the complete adversarial-surface analysis and the vocabulary-entry evidence) is on the [Tokenizer Analysis](/guide/tokenizer-analysis) page. The rest of this document is about a deeper question: once a boundary is gone from the token stream, can the model ever recover it?

## 3. Why Attention Cannot Recover It

The obvious hope is that a large, capable model simply learns to work around merged boundaries. It has billions of parameters and has seen enormous amounts of JSON; surely it can decompose `"name` back into "a quote, then a field named name." The research says: not really, and the reason is structural.

### Attention operates on token positions

A transformer's attention mechanism lets each token position gather information from other positions. An attention head is a specialized circuit that decides, for each position, which other positions to look at. Heads specialize: some track the previous token, some match brackets, some follow syntactic dependencies (Voita et al., 2019).

The hard constraint is this: **a head can only attend to something that exists as a token.** Attention is defined over positions in the token sequence. If a structural boundary is not a token in its own right (because BPE fused it into content), then there is no position for a head to point at. The boundary is not merely hard to find; it no longer exists as a distinct position. No head, however well trained, can attend to a position that does not exist.

### Stranded heads: the whole model is affected

The natural assumption is that this hurts a few delimiter-specialized heads. The finding is far stronger. Using a technique called **forced-clean tokenization**, the stranded-attention study took a standard BPE model and, at inference time only, segmented the input so that each delimiter became its own token before encoding. The model's weights did not change. Its vocabulary did not change. The input text did not change. The only difference was whether delimiters existed as separate tokens.

```
Input text:     {"name":"Alice"}

Normal BPE:     [{"name] [":]  [Alice] ["}]           (4 tokens)
Forced-clean:   [{] ["] [name] ["] [:] ["] [Alice] ["] [}]  (9 tokens)
```

Every token ID in the clean sequence already exists in the model's own vocabulary. The embedding for a lone `"` is one the model has seen millions of times; it simply never sees it in isolation when reading JSON, because BPE always merges it.

The result: **all 384 attention heads** in the 410M-parameter model, and **all 768 heads** at 1.3B, showed a dramatic jump in delimiter attention. Mean delimiter attention rose from 14% under normal tokenization to 54% under clean tokenization, nearly four times as much. Every head woke up. The smallest per-head increase was still +35 percentage points; the largest, +43. The circuitry for structural processing exists in the weights. The tokenizer prevents it from working.

This is why the phenomenon is named **stranding**. A stranded head is active but unproductive: it has latent capacity for structural specialization, but corrupted token boundaries prevent that capacity from being realized. The whole model is partially stranded, not a handful of heads.

### The frustration gap is immediate and permanent

If stranding were a temporary state that training eventually resolves, it would matter less. The training-dynamics experiment ruled this out. Running the same forced-clean analysis at eight checkpoints, from training step 5,000 through step 40,000, the gap between what the model can do (54% delimiter attention with clean input) and what the tokenizer allows (14% with normal input) did not move. It was already about 40 percentage points at step 5,000, the earliest checkpoint measured (roughly 330 million tokens of training), and it was still about 40 percentage points at step 40,000 (roughly 2.6 billion tokens). Across 35,000 additional training steps, it did not narrow by a single percentage point.

This 40-point gap is called the **frustration gap**: capacity that the model builds, that the gradient pushes it to use, and that the tokenizer permanently blocks. The gradient wants specialization; the tokenizer frustrates it. Training on more data does not help, because the boundaries the heads need are simply not present in the token stream, no matter how long training runs.

The gap is also stable, not a way station on the road to something else. A natural hypothesis is that stranded heads eventually give up and collapse into "attention sinks" (a known failure mode where a head dumps its attention onto position zero and stops contributing; Xiao et al., 2024; Sandoval-Segura et al., 2025). Measuring position-zero attention across training showed no such drift: stranded heads route a small, stable amount of extra attention to position zero as a fallback (+2.6 points) but never fully collapse. They occupy a stable, wasteful middle ground.

### The spacing capacity tax

The developmental atlas revealed a second, related cost that appears even on plain web text, where structured delimiters are rare. When a tokenizer merges characters into content, it also merges around whitespace. Recovering word and line boundaries becomes a job the model must do itself, and it dedicates a large fraction of its attention heads to exactly that.

On a standard BPE model trained on web text, 183 of 384 attention heads (47.7%) became **spacing specialists**: heads whose main job is recovering whitespace boundaries. On a Llama-architecture model, 154 of 384 (40.1%) did the same. Adding the roughly 8% of heads that collapse into position-zero sinks, **48 to 56% of all attention capacity in a standard BPE model is spent on recovery or wasted**, before the model does any content work. This spacing count is remarkably deterministic: two runs with different random seeds produced the identical 183 spacing heads.

### The three-state spectrum

Putting these findings together suggests a revision to how attention head states are usually described. The literature typically recognizes two states: active (doing useful work) and dormant (collapsed into a sink, safely removable). The research adds a third state in between:

| State | Behavior | Effect of removal |
|-------|----------|-------------------|
| **Structural anchoring** | Productive: locks onto clean delimiter tokens and uses them to navigate structure | Performance degrades sharply |
| **Stranded** | Active but unproductive: has capacity for structure but corrupted boundaries block it | Negligible effect |
| **Dormant** | Collapsed into an attention sink, contributes nothing | Safely removable |

Dormancy happens when there is nothing structural to do. Stranding happens when structural work is needed but the tokenizer makes it impossible. This also refines a prior observation: Sandoval-Segura et al. (2025) found that inputs with high "alphabet density" (few delimiters) produce more dormant heads. The atlas offers the causal pathway: low delimiter density means fewer clean anchoring targets, so heads either strand (when structure exists but is corrupted) or go dormant (when no structural signal exists at all).

## 4. That It Is Causal and Universal

Correlational findings on production models could always be explained away. So the core claims were established through controlled training experiments where the tokenizer was the only variable.

### The controlled experiment

Two models were trained as an identical pair: same architecture, same corpus, same hyperparameters, same random seed, same hardware. The only difference was whether 16 delimiter characters were allowed to participate in BPE merges. One model used a **merge-barrier** tokenizer (16 delimiters forbidden from merging); the other used standard BPE. Any difference in behavior can therefore be attributed to the tokenizer and nothing else.

The corpus was deliberately not JSON-heavy: JSON was 14% of the training data, with 33% general web text, 13% code, 8% GCF, and the remainder split among other formats and prose. This ensures that any structured-data advantage comes from how delimiters are treated, not from disproportionate exposure.

### Same weights, clean boundaries: 384 heads wake up

The forced-clean result from Section 3 is itself the causal proof at the level of a single model. Nothing about the model changed; only the presence of clean delimiter tokens at inference time. Yet all 384 heads (and all 768 at 1.3B) shifted from 14% to 54% delimiter attention. The capacity is in the weights. The tokenizer decides whether it can be used.

### Architecture independence

The mechanism is not an artifact of one attention design. It replicates across the two dominant production architectures:

- **GPT-NeoX** uses full multi-head attention (separate query, key, and value projections per head).
- **Llama** uses grouped-query attention (four query heads share each key-value projection), plus RoPE, SwiGLU, and RMSNorm.

Removing the whitespace-recovery spacing heads degrades performance by +64.3% on GPT-NeoX and +67.0% on Llama. That the causal cost is nearly identical across two very different attention mechanisms establishes that the capacity tax is a property of BPE tokenization, not of how attention happens to be structured. The finding was confirmed at two scales, 410M and 1.3B parameters.

### The scaling paradox

The intuition that a bigger model should shrug this off is exactly backwards. At 1.3B parameters, grouped-query attention gives the model enough signal to detect that delimiters are structurally important, so it dedicates 124 attention heads (16% of its capacity) to them. But because those delimiters are fused with content, those heads attend to corrupted positions, and their attention actively interferes with comprehension. Ablating them (removing them entirely) **improves** structured-data comprehension by 57%.

The same head positions, with a merge-barrier tokenizer, do the opposite: removing them degrades comprehension by more than 400%, because with clean boundaries they are doing essential work. Detection without clean boundaries is worse than no detection at all. Scaling does not solve stranding. It amplifies it.

### The fix: merge barriers

The intervention is small. A **merge barrier** simply forbids a set of delimiter characters from participating in any BPE merge. The BPE algorithm itself is unchanged; the merge-candidate list just excludes any pair containing a barrier character. As a result, each barrier character is always its own token. `"name` can never become a single token, because `"` can never merge with `n`. The model always sees explicit structural boundaries.

The barrier set is 16 characters, chosen to cover structured data and code: `| @ < > " ' : , ; \t { } [ ] ( )`. This is not a format-specific fix. It protects JSON, YAML, CSV, TOON, GCF, and code, all at once, because they all use these characters as structure.

Models trained with merge barriers achieve **3 to 738 times lower perplexity on structured data** (the range spans different formats and model scales), 1.5x lower on code, and 2.2x on molecular notation, with zero natural-language cost (final overall perplexity 19.4 with barriers versus 19.5 without, a tie). A separate result confirms the mechanism is about clean delimiters in general, not these specific characters: a barrier set built from entirely different natural-language characters produced attention-head distributions correlated at r=0.812 with the structured-data barrier set. Isolating any structural delimiters produces the same developmental outcome.

One clarification on metrics. The "3 to 738x" figure is **perplexity** on structured data, measured on the small controlled-training models. It is distinct from the comprehension accuracy numbers measured separately on production frontier models (GCF at 90.7% on adversarial code graphs and 100% on standard workloads; see [Tokenizer Analysis](/guide/tokenizer-analysis) and [Benchmarks](/guide/benchmarks)). The two lines of evidence agree, but they are different measurements on different models and should not be conflated.

### A note on scale

These controlled experiments top out at 1.3B parameters. Two things argue the effect does not simply vanish at frontier scale. Within the range tested it strengthens rather than weakens: the scaling paradox above wastes more capacity at 1.3B than at 410M, not less. And probing production models in the 7 to 8 billion parameter range (Mistral 7B, Llama 3.1 8B) shows the same grammar-attention collapse under structural load (grammar attention falling from about 30% to 8.6% at scale). Whether the effect fully persists at 100B parameters or more is not directly measured, and that is the honest limit of the current evidence.

## 5. The Applied Lesson

The takeaway generalizes well beyond any one format. It is a design principle for anything a language model reads:

**Use explicit, non-merging delimiters.** A boundary that survives tokenization as its own token is a boundary the attention mechanism can use. A boundary that BPE fuses into content is invisible to every head in the model, permanently, no matter how capable the model or how long it trained. If you are designing a format, a prompt template, a schema, or any structured input for an LLM, choose delimiter characters from the set that stays isolated across tokenizers, and avoid the ones (quote, colon, comma, tab, and whitespace-adjacent characters) that BPE aggressively merges.

This is the principle GCF was built on. GCF's grammar was reverse-engineered from tokenization and attention-level experimentation at design time: measurements of which delimiter characters stay isolated as their own tokens, and analysis of how attention treats structural boundaries. The pipe (`|`), `@`, and `<` were selected because they survive tokenization intact (99.5% structural isolation across all 43 tokenizers, versus 7.5% for JSON's grammar), and the format factors repeated field names into a header so almost every token carries data rather than structure. The three research papers cited throughout this page came afterward, dated July 2026, after the format had stabilized and shipped. They were not the source of the design; they are independent, after-the-fact validation of it. In one of them, GCF served as the clean-delimiter reference case that made stranding visible in the first place. After-the-fact confirmation is the stronger kind of evidence, because a shipped format cannot be accused of being built to flatter an analysis that did not yet exist.

### Where to go next

- **The GCF-specific data:** [Tokenizer Analysis](/guide/tokenizer-analysis) has the full 43-tokenizer study, the savings tables, the adversarial-surface scan, and the comprehension failure taxonomy.
- **The papers, for depth:**
  - Blackwell, D. (2026). *Tokenizer-Attention Coupling: How BPE Merge Decisions Permanently Shape Transformer Internal Organization.* [DOI: 10.5281/zenodo.20925910](https://doi.org/10.5281/zenodo.20925910)
  - Blackwell, D. (2026). *Stranded Attention: BPE Tokenization Permanently Constrains Transformer Structural Capacity.* [DOI: 10.5281/zenodo.21158886](https://doi.org/10.5281/zenodo.21158886)
  - Blackwell, D. (2026). *Developmental Atlas of Attention Head Specialization: Spacing, Stranding, and the Capacity Tax of BPE Tokenization.* [DOI: 10.5281/zenodo.21205389](https://doi.org/10.5281/zenodo.21205389)

### Prior work this builds on

Byte-Pair Encoding for neural sequence models is due to Sennrich, Haddow, and Birch (2016). Attention sinks were characterized by Xiao et al. (2024). Dormant heads were formalized by Sandoval-Segura et al. (2025). The observation that delimiter choice swings structured-data accuracy by roughly ±23% (the performance ranking that maps directly onto BPE merge rates) is due to Su et al. (2025). The three Blackwell papers above connect these threads to the tokenizer and prove the causal chain.
