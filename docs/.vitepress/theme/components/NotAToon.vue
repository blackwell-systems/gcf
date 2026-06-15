<template>
  <div class="poem">
    <!-- Hero -->
    <section class="poem-hero">
      <h1 class="poem-title">Not a TOON</h1>
      <p class="poem-subtitle">A cautionary tale about wire formats, for engineers of all ages.</p>
      <img src="/not-a-toon-hero.png" alt="Five data formats flow into the GCF funnel while TOON watches" class="hero-img" />
    </section>

    <!-- Chapter 1: The Problem -->
    <section class="chapter dark">
      <div class="chapter-label">Chapter I</div>
      <h2 class="chapter-title">The Problem with JSON</h2>

      <div class="stanza">
        <p>Would you send it as JSON?</p>
        <p>Would you send it with TOON?</p>
      </div>

      <img src="/not-a-toon-fork-road.png" alt="A fork in the road: JSON or TOON?" class="chapter-img medium" />

      <div class="stanza">
        <p>I would not send it as JSON.</p>
        <p>Not with all of those braces,</p>
        <p>not with all of those quotes,</p>
        <p>not with fifty-three thousand</p>
        <p>redundant key-notes.</p>
      </div>

      <div class="stanza accent">
        <p>"But TOON!" said the vendor.</p>
        <p>"TOON's smaller!" they cried.</p>
        <p>"TOON folds all your keys</p>
        <p>and puts commas inside!"</p>
      </div>

      <div class="stanza">
        <p>So I tried it with TOON.</p>
        <p>I tried it one day.</p>
        <p>I sent it five hundred</p>
        <p>symbols that way.</p>
      </div>

      <div class="stanza">
        <p>And TOON lost the count.</p>
        <p>TOON bungled the call.</p>
        <p>On GPT-5.5,</p>
        <p>TOON failed on them all.</p>
      </div>

      <img src="/not-a-toon-bungled-count.png" alt="TOON at the chalkboard with wrong numbers, robots holding red X cards" class="chapter-img" />
    </section>

    <!-- Chapter 2: The Formats -->
    <section class="chapter">
      <div class="chapter-label">Chapter II</div>
      <h2 class="chapter-title">Five Formats, One Refusal</h2>

      <div class="stanza">
        <p>I tried it with YAML.</p>
        <p>TOON said: "I can't eat that."</p>
        <p>I tried it with TOML.</p>
        <p>TOON said: "I can't read that."</p>
        <p>I tried CSV.</p>
        <p>TOON said: "What is that?"</p>
        <p>I tried MessagePack.</p>
        <p>TOON fled from the chat.</p>
      </div>

      <div class="img-pair">
        <img src="/not-a-toon-yaml-plate.png" alt="A friendly character offers YAML on a plate, TOON refuses" class="chapter-img" />
        <img src="/not-a-toon-fled-chat.png" alt="Five format characters chase TOON who runs in panic" class="chapter-img" />
      </div>
    </section>

    <!-- Chapter 3: Discovery -->
    <section class="chapter dark">
      <div class="chapter-label">Chapter III</div>
      <h2 class="chapter-title">The Discovery</h2>

      <div class="stanza">
        <p>So I tried it with GCF.</p>
        <p>I tried it one night.</p>
        <p>The header said <code>generic</code>.</p>
        <p>The rows were packed tight.</p>
      </div>

      <img src="/not-a-toon-discovery.png" alt="Late night discovery: GCF profile=generic glows above a desk with compact rows" class="chapter-img" />

      <div class="code-block">
        <code>## orders [10]{id,total,status}</code>
        <code>1001|249.99|shipped</code>
      </div>

      <div class="stanza">
        <p>No braces. No colons.</p>
        <p>No keys on each line.</p>
        <p>Just fields declared once</p>
        <p>and the data looked fine.</p>
      </div>

      <div class="stanza">
        <p>But could it do YAML?</p>
        <p>(I had YAML to send.)</p>
        <p>GCF parsed it and packed it.</p>
        <p>TOON said: "That's the end."</p>
      </div>

      <div class="stanza">
        <p>Could it do TOML?</p>
        <p>(A Cargo.toml, fifteen crates deep.)</p>
        <p>GCF tabularized it.</p>
        <p>TOON went back to sleep.</p>
      </div>

      <div class="stanza">
        <p>Could it do CSV?</p>
        <p>(Twenty rows, eight columns wide.)</p>
        <p>GCF took it directly.</p>
        <p>TOON ran off to hide.</p>
      </div>

      <div class="stanza">
        <p>Could it do MessagePack?</p>
        <p>(Binary, base64, the works.)</p>
        <p>GCF decoded and encoded.</p>
        <p>TOON said: "That format irks."</p>
      </div>

      <img src="/not-a-toon-gameshow.png" alt="GCF on stage as formats enter with questions and leave with checkmarks" class="chapter-img wide" />
    </section>

    <!-- Chapter 4: Graphs -->
    <section class="chapter">
      <div class="chapter-label">Chapter IV</div>
      <h2 class="chapter-title">The Graph Challenge</h2>

      <div class="stanza accent">
        <p>"But wait!" said the vendor.</p>
        <p>"Can your format do graphs?</p>
        <p>Can it handle the edges?</p>
        <p>Can it handle the paths?"</p>
      </div>

      <div class="code-block">
        <code>@0 fn pkg.AuthMiddleware 0.92 lsp</code>
        <code>@1 fn pkg.ValidateToken 0.87 lsp</code>
        <code>@0&lt;@1 calls</code>
      </div>

      <div class="stanza">
        <p>Four tokens per edge.</p>
        <p>Not thirty. Not ninety.</p>
        <p>Local IDs, not full names</p>
        <p>repeated so fighty.</p>
      </div>

      <img src="/not-a-toon-4-vs-90.png" alt="A tiny 4-plank bridge vs a massive sagging 90-plank bridge" class="chapter-img" />

      <div class="stanza">
        <p>TOON had no IDs.</p>
        <p>TOON had no edges.</p>
        <p>TOON wrote <code>github.com/org/repo/pkg.AuthMiddleware</code></p>
        <p>on every line, building ledges</p>
        <p>of tokens so tall</p>
        <p>that the context filled up</p>
        <p>before it said anything</p>
        <p>useful at all.</p>
      </div>

      <img src="/not-a-toon-no-ids.png" alt="TOON's collapsing tower of repeated identifiers vs GCF's compact @0 @1 @2 blocks" class="chapter-img" />
    </section>

    <!-- Chapter 5: Session Dedup -->
    <section class="chapter dark">
      <div class="chapter-label">Chapter V</div>
      <h2 class="chapter-title">The Session</h2>

      <div class="stanza accent">
        <p>"But wait!" said the vendor.</p>
        <p>"What about call two?</p>
        <p>The SAME symbols again,</p>
        <p>what does YOUR format do?"</p>
      </div>

      <div class="code-block">
        <code>@0  # previously transmitted</code>
        <code>@1  # previously transmitted</code>
        <code>@2  # previously transmitted</code>
      </div>

      <div class="stanza">
        <p>Call one: full payload.</p>
        <p>Call five: ninety-two percent bare.</p>
        <p>TOON sent the whole thing again.</p>
        <p>Every symbol. Every pair.</p>
      </div>

      <img src="/not-a-toon-session-dedup.png" alt="GCF delivers less each call while TOON carries the same huge sack every time" class="chapter-img wide" />

      <div class="stanza">
        <p>"Session dedup," I explained,</p>
        <p>"tracks what's been sent."</p>
        <p>TOON had no sessions.</p>
        <p>TOON had no concept.</p>
        <p>TOON re-sent everything,</p>
        <p>every single event.</p>
      </div>
    </section>

    <!-- Chapter 6: The Proof -->
    <section class="chapter">
      <div class="chapter-label">Chapter VI</div>
      <h2 class="chapter-title">The Proof</h2>

      <div class="stanza accent">
        <p>"But is it LOSSLESS?" they asked,</p>
        <p>with a skeptical frown.</p>
        <p>"Can you prove that it works</p>
        <p>when the data goes down</p>
        <p>through encode and decode</p>
        <p>and back up again?</p>
        <p>With no bits lost or mangled</p>
        <p>or misplaced, and then..."</p>
      </div>

      <img src="/not-a-toon-prove-it.png" alt="Skeptical judges demand proof while GCF sits calmly before a wall of 33 billion evidence" class="chapter-img wide" />

      <div class="big-number">33,000,000,000</div>
      <p class="big-number-label">round-trips. zero failures.</p>

      <img src="/not-a-toon-33-billion.png" alt="A towering stack of 33 billion round-trips with a green checkmark" class="chapter-img small" />

      <div class="stanza">
        <p>JSON: eleven billion.</p>
        <p>YAML: eleven billion too.</p>
        <p>MessagePack, CSV, TOML:</p>
        <p>a billion between the few.</p>
      </div>

      <div class="stanza">
        <p>Six languages tested.</p>
        <p>Go, Rust, TypeScript, Python,</p>
        <p>Swift, Kotlin: all passing.</p>
        <p>Not a single byte bitten.</p>
      </div>

      <div class="stanza highlight">
        <p>Zero failures.</p>
        <p>Not one in thirty-three billion tries.</p>
        <p>TOON published... no fuzz data.</p>
        <p>No round-trips. No tries.</p>
      </div>
    </section>

    <!-- Chapter 7: Readability -->
    <section class="chapter dark">
      <div class="chapter-label">Chapter VII</div>
      <h2 class="chapter-title">The Readability Question</h2>

      <div class="stanza accent">
        <p>"But humans can't READ it!"</p>
        <p>they said with dismay.</p>
        <p>"It's dense! It's compact!</p>
        <p>It's not readable that way!"</p>
      </div>

      <img src="/not-a-toon-humans-cant-read.png" alt="Humans panic while a robot reads GCF at 100% with tea" class="chapter-img" />

      <div class="stanza">
        <p>Neither is protobuf.</p>
        <p>Neither are gzip bytes.</p>
        <p>You don't read the wire format.</p>
        <p>You read what it writes.</p>
      </div>

      <div class="stanza">
        <p><code>decode()</code> at the end.</p>
        <p>One function call away.</p>
        <p>The human sees JSON.</p>
        <p>The agent sees GCF all day.</p>
      </div>

      <img src="/not-a-toon-agent-human-decode.png" alt="The Agent reads GCF efficiently, decode() transforms it, The Human reads JSON comfortably" class="chapter-img wide" />

      <div class="stanza">
        <p>The context window savings?</p>
        <p>Already banked, already done.</p>
        <p>The model reads it at one hundred percent.</p>
        <p>JSON drops to fifty-three point one.</p>
      </div>
    </section>

    <!-- Finale -->
    <section class="chapter finale">
      <h2 class="chapter-title finale-title">The Verdict</h2>

      <div class="stanza">
        <p>So would you send it as JSON?</p>
      </div>

      <div class="stanza dramatic">
        <p>I would not.</p>
      </div>

      <div class="stanza">
        <p>Would you send it with TOON?</p>
      </div>

      <div class="stanza dramatic">
        <p>I could not, would not, with a TOON.</p>
        <p>Not a TOON, not a PLOON,</p>
        <p>not a BLOON or a SPOON.</p>
        <p>Not with any format</p>
        <p>that ends with <em>-OON</em>.</p>
      </div>

      <img src="/not-a-toon-oons-wrong.png" alt="TOON, PLOON, BLOON, and SPOON defeated on a bench while GCF glows on the podium" class="chapter-img" />

      <div class="stanza">
        <p>I would send it with GCF.</p>
        <p>I would send it today.</p>
        <p>In JSON or YAML</p>
        <p>or TOML or CSV,</p>
        <p>in MessagePack binary,</p>
        <p>in any which way.</p>
      </div>

      <img src="/not-a-toon-parade.png" alt="GCF leads a victory parade with all five format characters" class="chapter-img" />

      <div class="stanza">
        <p>GCF takes your data,</p>
        <p>whatever the source.</p>
        <p>GCF packs it tight</p>
        <p>on a lossless course.</p>
      </div>

      <div class="stanza">
        <p>Thirty-three billion times tested.</p>
        <p>Six languages strong.</p>
        <p>One hundred percent comprehension.</p>
      </div>

      <div class="closing-line">The *-OONs were wrong.</div>

      <img src="/not-a-toon-closing.png" alt="The OONs were wrong - GCF triumphant with five format streams" class="chapter-img wide" />
    </section>

    <!-- CTA -->
    <section class="cta">
      <div class="cta-links">
        <a href="/playground.html" class="cta-btn primary">Try it yourself</a>
        <a href="/guide/benchmarks.html" class="cta-btn">See the benchmarks</a>
        <a href="/reference/spec.html" class="cta-btn">Read the spec</a>
      </div>
      <p class="cta-sub">1,700+ LLM evaluations. Every frontier model. Six implementations. 157 conformance fixtures.</p>
    </section>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Patrick+Hand&display=swap');

.poem {
  font-family: 'Patrick Hand', cursive;
  color: #e8e8e8;
  max-width: 100%;
  overflow-x: hidden;
}

/* Hero */
.poem-hero {
  text-align: center;
  padding: 80px 24px 60px;
  background: radial-gradient(ellipse at 50% 20%, rgba(24, 190, 252, 0.08) 0%, transparent 70%);
}

.poem-title {
  font-family: 'Patrick Hand', cursive !important;
  font-size: 5rem;
  font-weight: 400;
  color: #fff;
  margin: 0 0 16px;
  letter-spacing: 0.02em;
  text-shadow: 0 0 40px rgba(24, 190, 252, 0.3);
}

.poem-subtitle {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.5);
  font-style: italic;
  margin: 0 0 48px;
}

.hero-img {
  max-width: 750px;
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

/* Chapters */
.chapter {
  padding: 80px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.chapter.dark {
  max-width: 100%;
  background: rgba(255, 255, 255, 0.02);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.chapter.dark > * {
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.chapter-label {
  font-family: 'Patrick Hand', cursive;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  color: var(--gcf-blue, #18befc);
  opacity: 0.6;
  margin-bottom: 8px;
  text-align: center;
}

.chapter-title {
  font-family: 'Patrick Hand', cursive !important;
  font-size: 2.8rem;
  font-weight: 400;
  color: #fff;
  text-align: center;
  margin: 0 0 48px;
  text-shadow: 0 0 30px rgba(24, 190, 252, 0.15);
}

/* Stanzas */
.stanza {
  text-align: center;
  margin: 36px auto;
  max-width: 600px;
}

.stanza p {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.35rem;
  line-height: 1.85;
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
}

.stanza.accent {
  border-left: 3px solid var(--gcf-blue, #18befc);
  padding-left: 24px;
  text-align: left;
}

.stanza.accent p {
  font-family: 'Lora', Georgia, serif;
  font-style: italic;
  color: rgba(255, 255, 255, 0.95);
}

.stanza.dramatic p {
  font-family: 'Patrick Hand', cursive;
  font-size: 2.2rem;
  color: #fff;
  text-shadow: 0 0 20px rgba(24, 190, 252, 0.2);
}

.stanza.highlight {
  background: rgba(24, 190, 252, 0.06);
  border: 1px solid rgba(24, 190, 252, 0.15);
  border-radius: 12px;
  padding: 28px 32px;
}

.stanza.highlight p {
  font-family: 'Patrick Hand', cursive;
  color: var(--gcf-blue, #18befc);
  font-size: 1.7rem;
}

/* Images */
.chapter-img {
  display: block;
  margin: 40px auto;
  max-width: 600px;
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.chapter-img.wide {
  max-width: 750px;
}

.chapter-img.medium {
  max-width: 500px;
}

.chapter-img.small {
  max-width: 400px;
}

.img-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin: 40px auto;
  max-width: 750px;
}

.img-pair .chapter-img {
  max-width: 100%;
  margin: 0;
}

/* Code blocks */
.code-block {
  background: #0a0a0a;
  border: 1px solid rgba(24, 190, 252, 0.2);
  border-radius: 12px;
  padding: 20px 28px;
  margin: 32px auto;
  max-width: 550px;
  text-align: left;
}

.code-block code {
  display: block;
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.95rem;
  color: var(--gcf-blue, #18befc);
  line-height: 1.8;
}

/* Big number callout */
.big-number {
  font-family: 'Patrick Hand', cursive;
  font-size: 4.5rem;
  font-weight: 400;
  text-align: center;
  color: var(--gcf-blue, #18befc);
  text-shadow: 0 0 40px rgba(24, 190, 252, 0.3);
  margin: 48px 0 8px;
  letter-spacing: 0.02em;
}

.big-number-label {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.4rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin: 0 0 40px;
}

/* Inline code */
.stanza code {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.85em;
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
}

/* Finale */
.finale {
  background: radial-gradient(ellipse at 50% 80%, rgba(24, 190, 252, 0.06) 0%, transparent 70%) !important;
  border: none !important;
  padding-bottom: 40px !important;
}

.finale-title {
  font-size: 3.2rem !important;
}

.closing-line {
  font-family: 'Patrick Hand', cursive;
  font-size: 3.5rem;
  text-align: center;
  color: var(--gcf-blue, #18befc);
  text-shadow: 0 0 40px rgba(24, 190, 252, 0.4);
  margin: 48px 0;
  letter-spacing: 0.02em;
}

/* CTA */
.cta {
  text-align: center;
  padding: 60px 24px 80px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.cta-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-bottom: 24px;
}

.cta-btn {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.3rem;
  padding: 14px 32px;
  border-radius: 10px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04);
  transition: all 0.2s;
}

.cta-btn:hover {
  border-color: var(--gcf-blue, #18befc);
  color: #fff;
  background: rgba(24, 190, 252, 0.08);
  transform: translateY(-2px);
}

.cta-btn.primary {
  background: var(--gcf-blue, #18befc);
  border-color: var(--gcf-blue, #18befc);
  color: #000;
  font-weight: 700;
}

.cta-btn.primary:hover {
  background: #fff;
  border-color: #fff;
  box-shadow: 0 0 30px rgba(24, 190, 252, 0.4);
}

.cta-sub {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.3);
}

/* Mobile */
@media (max-width: 640px) {
  .poem-title { font-size: 3rem; }
  .poem-subtitle { font-size: 1.2rem; }
  .chapter-title { font-size: 2rem; }
  .stanza p { font-size: 1.15rem; }
  .stanza.dramatic p { font-size: 1.7rem; }
  .big-number { font-size: 3rem; }
  .closing-line { font-size: 2.5rem; }
  .chapter { padding: 48px 20px; }
  .img-pair { grid-template-columns: 1fr; }
}
</style>
