<script setup>
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import mediumZoom from 'medium-zoom'

const poem = ref(null)

onMounted(() => {
  // Scroll reveal with staggered lines
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible')

          // Stagger child <p> elements inside stanzas
          if (entry.target.classList.contains('stanza')) {
            const lines = entry.target.querySelectorAll('p')
            lines.forEach((line, i) => {
              line.style.transitionDelay = `${i * 120}ms`
            })
          }
        }
      })
    },
    { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
  )

  if (poem.value) {
    poem.value.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    nextTick(() => {
      mediumZoom(poem.value.querySelectorAll('img'), { background: 'rgba(0, 0, 0, 0.92)' })
    })
  }

  // Parallax on images
  const images = poem.value?.querySelectorAll('.chapter-img') || []
  const onScroll = () => {
    const scrollY = window.scrollY
    images.forEach((img) => {
      const rect = img.getBoundingClientRect()
      const center = rect.top + rect.height / 2
      const viewCenter = window.innerHeight / 2
      const offset = (center - viewCenter) * 0.04
      img.style.transform = `translateY(${offset}px)`
    })
  }

  window.addEventListener('scroll', onScroll, { passive: true })

  // Seuss scrollbar
  document.documentElement.classList.add('seuss-scrollbar')

  onUnmounted(() => {
    observer.disconnect()
    window.removeEventListener('scroll', onScroll)
    document.documentElement.classList.remove('seuss-scrollbar')
  })
})
</script>

<template>
  <div class="poem" ref="poem">
    <!-- Hero -->
    <section class="poem-hero">
      <div class="hero-inner">
        <p class="hero-eyebrow">A cautionary tale about wire formats</p>
        <h1 class="poem-title">Not a <span class="title-accent">TOON</span></h1>
        <p class="poem-subtitle">for engineers of all ages</p>
        <div class="hero-divider"></div>
      </div>
      <img src="/not-a-toon-hero.png" alt="Five data formats flow into the GCF funnel while TOON watches" class="hero-img reveal" />
    </section>

    <!-- Chapter 1: The Problem -->
    <section class="chapter dark">
      <div class="chapter-header reveal">
        <div class="chapter-ornament">&#x2726;</div>
        <div class="chapter-label">Chapter I</div>
        <h2 class="chapter-title">The Problem with JSON</h2>
      </div>

      <div class="stanza reveal">
        <p>Would you send it as JSON?</p>
        <p>Would you send it with TOON?</p>
      </div>

      <img src="/not-a-toon-fork-road.png" alt="A fork in the road: JSON or TOON?" class="chapter-img medium reveal" />

      <div class="stanza reveal">
        <p>I would not send it as JSON.</p>
        <p>Not with all of those braces,</p>
        <p>not with all of those quotes,</p>
        <p>not with fifty-three thousand</p>
        <p>redundant key-notes.</p>
      </div>

      <img src="/not-a-toon-vendor.png" alt="A slick vendor pitches TOON from a market stall while a skeptical engineer watches" class="chapter-img reveal" />

      <div class="stanza accent reveal">
        <p>"But TOON!" said the vendor.</p>
        <p>"TOON's smaller!" they cried.</p>
        <p>"TOON folds all your keys</p>
        <p>and puts commas inside!"</p>
      </div>

      <div class="stanza reveal">
        <p>So I tried it with TOON.</p>
        <p>I tried it one day.</p>
        <p>I sent it five hundred</p>
        <p>symbols that way.</p>
      </div>

      <div class="stanza reveal">
        <p>And TOON lost the count.</p>
        <p>TOON bungled the call.</p>
        <p>On GPT-5.5,</p>
        <p>TOON failed on them all.</p>
      </div>

      <img src="/not-a-toon-bungled-count.png" alt="TOON at the chalkboard with wrong numbers, robots holding red X cards" class="chapter-img reveal" />
    </section>

    <!-- Chapter 2: The Formats -->
    <section class="chapter">
      <div class="chapter-header reveal">
        <div class="chapter-ornament">&#x2726;</div>
        <div class="chapter-label">Chapter II</div>
        <h2 class="chapter-title">Five Formats, One Refusal</h2>
      </div>

      <div class="stanza reveal">
        <p>I tried it with YAML.</p>
        <p>TOON said: "I can't eat that."</p>
        <p>I tried it with TOML.</p>
        <p>TOON said: "I can't read that."</p>
        <p>I tried CSV.</p>
        <p>TOON said: "What is that?"</p>
        <p>I tried MessagePack.</p>
        <p>TOON fled from the chat.</p>
      </div>

      <img src="/not-a-toon-yaml-plate.png" alt="A friendly character offers YAML on a plate, TOON refuses" class="chapter-img reveal" />
      <img src="/not-a-toon-fled-chat.png" alt="Five format characters chase TOON who runs in panic" class="chapter-img reveal" />
    </section>

    <!-- Chapter 3: Discovery -->
    <section class="chapter dark">
      <div class="chapter-header reveal">
        <div class="chapter-ornament">&#x2726;</div>
        <div class="chapter-label">Chapter III</div>
        <h2 class="chapter-title">The Discovery</h2>
      </div>

      <div class="stanza reveal">
        <p>So I tried it with GCF.</p>
        <p>I tried it one night.</p>
        <p>The header said <code>generic</code>.</p>
        <p>The rows were packed tight.</p>
      </div>

      <img src="/not-a-toon-discovery.png" alt="Late night discovery: GCF profile=generic glows above a desk with compact rows" class="chapter-img reveal" />

      <div class="code-block reveal">
        <code>## orders [10]{id,total,status}</code>
        <code>1001|249.99|shipped</code>
      </div>

      <div class="stanza reveal">
        <p>No braces. No colons.</p>
        <p>No keys on each line.</p>
        <p>Just fields declared once</p>
        <p>and the data looked fine.</p>
      </div>

      <img src="/not-a-toon-banquet.png" alt="GCF feasts on YAML, TOML, CSV, and MessagePack while TOON watches horrified through the window" class="chapter-img wide reveal" />

      <div class="stanza reveal">
        <p>But could it do YAML?</p>
        <p>(I had YAML to send.)</p>
        <p>GCF parsed it and packed it.</p>
        <p>TOON said: "That's the end."</p>
      </div>

      <div class="stanza reveal">
        <p>Could it do TOML?</p>
        <p>(A Cargo.toml, fifteen crates deep.)</p>
        <p>GCF tabularized it.</p>
        <p>TOON went back to sleep.</p>
      </div>

      <div class="stanza reveal">
        <p>Could it do CSV?</p>
        <p>(Twenty rows, eight columns wide.)</p>
        <p>GCF took it directly.</p>
        <p>TOON ran off to hide.</p>
      </div>

      <div class="stanza reveal">
        <p>Could it do MessagePack?</p>
        <p>(Binary, base64, the works.)</p>
        <p>GCF decoded and encoded.</p>
        <p>TOON said: "That format irks."</p>
      </div>

      <img src="/not-a-toon-gameshow.png" alt="GCF on stage as formats enter with questions and leave with checkmarks" class="chapter-img wide reveal" />
    </section>

    <!-- Chapter 4: Graphs -->
    <section class="chapter">
      <div class="chapter-header reveal">
        <div class="chapter-ornament">&#x2726;</div>
        <div class="chapter-label">Chapter IV</div>
        <h2 class="chapter-title">The Graph Challenge</h2>
      </div>

      <div class="stanza accent reveal">
        <p>"But wait!" said the vendor.</p>
        <p>"Can your format do graphs?</p>
        <p>Can it handle the edges?</p>
        <p>Can it handle the paths?"</p>
      </div>

      <div class="code-block reveal">
        <code>@0 fn pkg.AuthMiddleware 0.92 lsp</code>
        <code>@1 fn pkg.ValidateToken 0.87 lsp</code>
        <code>@0&lt;@1 calls</code>
      </div>

      <div class="stanza reveal">
        <p>Four tokens per edge.</p>
        <p>Not thirty. Not ninety.</p>
        <p>Local IDs, not full names</p>
        <p>repeated so fighty.</p>
      </div>

      <img src="/not-a-toon-4-vs-90.png" alt="A tiny 4-plank bridge vs a massive sagging 90-plank bridge" class="chapter-img reveal" />

      <div class="stanza reveal">
        <p>TOON had no IDs.</p>
        <p>TOON had no edges.</p>
        <p>TOON wrote <code>github.com/org/repo/pkg.AuthMiddleware</code></p>
        <p>on every line, building ledges</p>
        <p>of tokens so tall</p>
        <p>that the context filled up</p>
        <p>before it said anything</p>
        <p>useful at all.</p>
      </div>

      <img src="/not-a-toon-no-ids.png" alt="TOON's collapsing tower of repeated identifiers vs GCF's compact @0 @1 @2 blocks" class="chapter-img reveal" />
    </section>

    <!-- Chapter 5: Session Dedup -->
    <section class="chapter dark">
      <div class="chapter-header reveal">
        <div class="chapter-ornament">&#x2726;</div>
        <div class="chapter-label">Chapter V</div>
        <h2 class="chapter-title">The Session</h2>
      </div>

      <div class="stanza accent reveal">
        <p>"But wait!" said the vendor.</p>
        <p>"What about call two?</p>
        <p>The SAME symbols again,</p>
        <p>what does YOUR format do?"</p>
      </div>

      <div class="code-block reveal">
        <code>@0  # previously transmitted</code>
        <code>@1  # previously transmitted</code>
        <code>@2  # previously transmitted</code>
      </div>

      <div class="stanza reveal">
        <p>Call one: full payload.</p>
        <p>Call five: ninety-two percent bare.</p>
        <p>TOON sent the whole thing again.</p>
        <p>Every symbol. Every pair.</p>
      </div>

      <img src="/not-a-toon-session-dedup.png" alt="GCF delivers less each call while TOON carries the same huge sack every time" class="chapter-img wide reveal" />

      <div class="stanza reveal">
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
      <div class="chapter-header reveal">
        <div class="chapter-ornament">&#x2726;</div>
        <div class="chapter-label">Chapter VI</div>
        <h2 class="chapter-title">The Proof</h2>
      </div>

      <div class="stanza accent reveal">
        <p>"But is it LOSSLESS?" they asked,</p>
        <p>with a skeptical frown.</p>
        <p>"Can you prove that it works</p>
        <p>when the data goes down</p>
        <p>through encode and decode</p>
        <p>and back up again?</p>
        <p>With no bits lost or mangled</p>
        <p>or misplaced, and then..."</p>
      </div>

      <img src="/not-a-toon-prove-it.png" alt="Skeptical judges demand proof while GCF sits calmly before a wall of 33 billion evidence" class="chapter-img wide reveal" />

      <div class="big-number reveal">
        <span class="big-number-value">33,000,000,000</span>
        <span class="big-number-label">round-trips. zero failures.</span>
      </div>

      <img src="/not-a-toon-33-billion.png" alt="A towering stack of 33 billion round-trips with a green checkmark" class="chapter-img small reveal" />

      <div class="stanza reveal">
        <p>JSON: eleven billion.</p>
        <p>YAML: eleven billion too.</p>
        <p>MessagePack, CSV, TOML:</p>
        <p>a billion between the few.</p>
      </div>

      <div class="stanza reveal">
        <p>Six languages tested.</p>
        <p>Go, Rust, TypeScript, Python,</p>
        <p>Swift, Kotlin: all passing.</p>
        <p>Not a single byte bitten.</p>
      </div>

      <div class="stanza highlight reveal">
        <p>Zero failures.</p>
        <p>Not one in thirty-three billion tries.</p>
        <p>TOON published... no fuzz data.</p>
        <p>No round-trips. No tries.</p>
      </div>
    </section>

    <!-- Chapter 7: Readability -->
    <section class="chapter dark">
      <div class="chapter-header reveal">
        <div class="chapter-ornament">&#x2726;</div>
        <div class="chapter-label">Chapter VII</div>
        <h2 class="chapter-title">The Readability Question</h2>
      </div>

      <div class="stanza accent reveal">
        <p>"But humans can't READ it!"</p>
        <p>they said with dismay.</p>
        <p>"It's dense! It's compact!</p>
        <p>It's not readable that way!"</p>
      </div>

      <img src="/not-a-toon-humans-cant-read.png" alt="Humans panic while a robot reads GCF at 100% with tea" class="chapter-img reveal" />

      <div class="stanza reveal">
        <p>Neither is protobuf.</p>
        <p>Neither are gzip bytes.</p>
        <p>You don't read the wire format.</p>
        <p>You read what it writes.</p>
      </div>

      <div class="stanza reveal">
        <p><code>decode()</code> at the end.</p>
        <p>One function call away.</p>
        <p>The human sees JSON.</p>
        <p>The agent sees GCF all day.</p>
      </div>

      <img src="/not-a-toon-agent-human-decode.png" alt="The Agent reads GCF efficiently, decode() transforms it, The Human reads JSON comfortably" class="chapter-img wide reveal" />

      <div class="stanza reveal">
        <p>The context window savings?</p>
        <p>Already banked, already done.</p>
        <p>The model reads it at one hundred percent.</p>
        <p>JSON drops to fifty-three point one.</p>
      </div>
    </section>

    <!-- Finale -->
    <section class="chapter finale">
      <div class="chapter-header reveal">
        <div class="chapter-ornament finale-ornament">&#x2605;</div>
        <h2 class="chapter-title finale-title">The Verdict</h2>
      </div>

      <div class="stanza reveal">
        <p>So would you send it as JSON?</p>
      </div>

      <div class="stanza dramatic reveal">
        <p>I would not.</p>
      </div>

      <div class="stanza reveal">
        <p>Would you send it with TOON?</p>
      </div>

      <div class="stanza dramatic reveal">
        <p>I could not, would not, with a TOON.</p>
        <p>Not a TOON, not a PLOON,</p>
        <p>not a BLOON or a SPOON.</p>
        <p>Not with any format</p>
        <p>that ends with <em>-OON</em>.</p>
      </div>

      <img src="/not-a-toon-oons-wrong.png" alt="TOON, PLOON, BLOON, and SPOON defeated on a bench while GCF glows on the podium" class="chapter-img reveal" />

      <div class="stanza reveal">
        <p>I would send it with GCF.</p>
        <p>I would send it today.</p>
        <p>In JSON or YAML</p>
        <p>or TOML or CSV,</p>
        <p>in MessagePack binary,</p>
        <p>in any which way.</p>
      </div>

      <img src="/not-a-toon-parade.png" alt="GCF leads a victory parade with all five format characters" class="chapter-img reveal" />

      <div class="stanza reveal">
        <p>GCF takes your data,</p>
        <p>whatever the source.</p>
        <p>GCF packs it tight</p>
        <p>on a lossless course.</p>
      </div>

      <div class="stanza reveal">
        <p>Thirty-three billion times tested.</p>
        <p>Six languages strong.</p>
        <p>One hundred percent comprehension.</p>
      </div>

      <div class="closing-line reveal">The *-OONs were wrong</div>

      <img src="/not-a-toon-closing.png" alt="The OONs were wrong - GCF triumphant with five format streams" class="chapter-img wide reveal" />
    </section>

    <!-- CTA -->
    <section class="cta reveal">
      <div class="cta-divider"></div>
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

/* Scroll reveal */
.reveal {
  opacity: 0;
  transform: translateY(32px);
  transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

.poem {
  color: #e8e8e8;
  max-width: 100%;
  overflow-x: clip;
}

.poem *,
.poem *::before,
.poem *::after {
  box-sizing: border-box;
}

/* ── Hero ── */
.poem-hero {
  text-align: center;
  padding: 120px 24px 80px;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(24, 190, 252, 0.1) 0%, transparent 60%),
    radial-gradient(circle at 20% 80%, rgba(24, 190, 252, 0.04) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(24, 190, 252, 0.04) 0%, transparent 40%);
}

.hero-inner {
  margin-bottom: 72px;
}

.hero-eyebrow {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.1rem;
  font-style: italic;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.08em;
  margin: 0 0 40px;
}

.poem-title {
  font-family: 'Patrick Hand', cursive !important;
  font-size: 6rem;
  font-weight: 400;
  color: #fff;
  margin: 0 0 24px;
  letter-spacing: 0.03em;
  line-height: 1.1;
}

.title-accent {
  color: var(--gcf-blue, #18befc);
  text-shadow: 0 0 60px rgba(24, 190, 252, 0.4), 0 0 120px rgba(24, 190, 252, 0.15);
}

.poem-subtitle {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.2rem;
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  margin: 12px 0 0;
}

.hero-divider {
  width: 60px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gcf-blue, #18befc), transparent);
  margin: 32px auto 0;
  opacity: 0.5;
}

.hero-img {
  display: block;
  margin: 0 auto;
  max-width: 800px;
  width: 100%;
  border-radius: 20px;
  box-shadow:
    0 24px 80px rgba(0, 0, 0, 0.6),
    0 0 60px rgba(24, 190, 252, 0.08);
}

/* ── Chapters ── */
.chapter {
  padding: 100px 24px;
  max-width: 800px;
  margin: 0 auto;
}

.chapter.dark {
  max-width: 100%;
  background:
    linear-gradient(180deg, rgba(24, 190, 252, 0.02) 0%, transparent 30%, transparent 70%, rgba(24, 190, 252, 0.02) 100%);
  border-top: 1px solid rgba(255, 255, 255, 0.03);
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.chapter.dark > * {
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.chapter-header {
  text-align: center;
  margin-bottom: 56px;
}

.chapter-ornament {
  font-size: 0.9rem;
  color: var(--gcf-blue, #18befc);
  opacity: 0.3;
  margin-bottom: 16px;
}

.chapter-label {
  font-family: 'Lora', Georgia, serif;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.35em;
  color: var(--gcf-blue, #18befc);
  opacity: 0.5;
  margin-bottom: 12px;
}

.chapter-title {
  font-family: 'Patrick Hand', cursive !important;
  font-size: 2.8rem;
  font-weight: 400;
  color: #fff;
  margin: 0;
  text-shadow: 0 0 30px rgba(24, 190, 252, 0.12);
}

/* ── Stanzas ── */
.stanza {
  text-align: center;
  margin: 44px auto;
  max-width: 580px;
}

.stanza p {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.3rem;
  line-height: 2;
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  opacity: 0;
  transform: translateY(12px);
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.stanza.visible p {
  opacity: 1;
  transform: translateY(0);
}

.stanza.accent {
  border-left: 2px solid rgba(24, 190, 252, 0.35);
  padding-left: 28px;
  text-align: left;
  max-width: 560px;
}

.stanza.accent p {
  font-family: 'Lora', Georgia, serif;
  font-style: italic;
  color: rgba(255, 255, 255, 0.9);
}

.stanza.dramatic {
  margin: 56px auto;
}

.stanza.dramatic p {
  font-family: 'Patrick Hand', cursive;
  font-size: 2.4rem;
  line-height: 1.5;
  color: #fff;
  text-shadow: 0 0 30px rgba(24, 190, 252, 0.2);
}

.stanza.highlight {
  background: rgba(24, 190, 252, 0.04);
  border: 1px solid rgba(24, 190, 252, 0.1);
  border-radius: 16px;
  padding: 36px 40px;
  max-width: 560px;
}

.stanza.highlight p {
  font-family: 'Patrick Hand', cursive;
  color: var(--gcf-blue, #18befc);
  font-size: 1.6rem;
  line-height: 1.7;
}

/* ── Images ── */
.chapter-img {
  display: block;
  margin: 48px auto;
  max-width: 600px;
  width: 100%;
  border-radius: 20px;
  box-shadow:
    0 16px 48px rgba(0, 0, 0, 0.5),
    0 0 40px rgba(24, 190, 252, 0.05);
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.chapter-img {
  cursor: zoom-in;
  will-change: transform;
  transition: box-shadow 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

.chapter-img:hover {
  box-shadow:
    0 20px 60px rgba(0, 0, 0, 0.55),
    0 0 60px rgba(24, 190, 252, 0.1);
}

.chapter-img.wide { max-width: 750px; }
.chapter-img.medium { max-width: 500px; }
.chapter-img.small { max-width: 400px; }

.img-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin: 48px auto;
  max-width: 750px;
}

.img-pair .chapter-img {
  max-width: 100%;
  margin: 0;
}

/* ── Code blocks ── */
.code-block {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(24, 190, 252, 0.15);
  border-radius: 14px;
  padding: 24px 32px;
  margin: 40px auto;
  max-width: 540px;
  text-align: left;
  backdrop-filter: blur(8px);
}

.code-block code {
  display: block;
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.9rem;
  color: var(--gcf-blue, #18befc);
  line-height: 1.9;
  letter-spacing: 0.02em;
}

/* ── Big number ── */
.big-number {
  text-align: center;
  margin: 64px 0;
}

.big-number-value {
  display: block;
  font-family: 'Patrick Hand', cursive;
  font-size: 5rem;
  font-weight: 400;
  color: var(--gcf-blue, #18befc);
  text-shadow:
    0 0 40px rgba(24, 190, 252, 0.3),
    0 0 80px rgba(24, 190, 252, 0.1);
  letter-spacing: 0.02em;
  line-height: 1.1;
}

.big-number-label {
  display: block;
  font-family: 'Lora', Georgia, serif;
  font-size: 1.15rem;
  color: rgba(255, 255, 255, 0.3);
  text-transform: uppercase;
  letter-spacing: 0.25em;
  margin-top: 28px;
}

/* ── Inline code ── */
.stanza code {
  font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace;
  font-size: 0.82em;
  color: var(--gcf-blue, #18befc);
  background: rgba(24, 190, 252, 0.06);
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(24, 190, 252, 0.08);
}

/* ── Finale ── */
.finale {
  max-width: 100% !important;
  background:
    radial-gradient(ellipse at 50% 70%, rgba(24, 190, 252, 0.08) 0%, transparent 60%) !important;
  border: none !important;
  padding: 100px 24px 60px !important;
}

.finale > * {
  max-width: 800px;
  margin-left: auto;
  margin-right: auto;
}

.finale-ornament {
  font-size: 1.2rem !important;
  opacity: 0.5 !important;
}

.finale-title {
  font-size: 3.4rem !important;
  text-shadow: 0 0 40px rgba(24, 190, 252, 0.2) !important;
}

.closing-line {
  font-family: 'Patrick Hand', cursive;
  font-size: 4rem;
  text-align: center;
  color: var(--gcf-blue, #18befc);
  text-shadow:
    0 0 40px rgba(24, 190, 252, 0.5),
    0 0 80px rgba(24, 190, 252, 0.2);
  margin: 64px auto;
  letter-spacing: 0.02em;
}

/* ── CTA ── */
.cta {
  text-align: center;
  padding: 80px 24px 100px;
}

.cta-divider {
  width: 80px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
  margin: 0 auto 48px;
}

.cta-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  margin-bottom: 28px;
}

.cta-btn {
  font-family: 'Lora', Georgia, serif;
  font-size: 1.15rem;
  padding: 16px 36px;
  border-radius: 12px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.cta-btn:hover {
  border-color: rgba(24, 190, 252, 0.4);
  color: #fff;
  background: rgba(24, 190, 252, 0.06);
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.cta-btn.primary {
  background: var(--gcf-blue, #18befc);
  border-color: var(--gcf-blue, #18befc);
  color: #000;
  font-weight: 600;
}

.cta-btn.primary:hover {
  background: #fff;
  border-color: #fff;
  box-shadow:
    0 8px 24px rgba(0, 0, 0, 0.3),
    0 0 40px rgba(24, 190, 252, 0.3);
}

.cta-sub {
  font-family: 'Lora', Georgia, serif;
  font-size: 1rem;
  color: rgba(255, 255, 255, 0.2);
  letter-spacing: 0.02em;
}

/* ── Mobile ── */
@media (max-width: 640px) {
  .poem-hero { padding: 80px 20px 60px; }
  .poem-title { font-size: 3.5rem; }
  .hero-eyebrow { font-size: 0.95rem; }
  .chapter-title { font-size: 2.2rem; }
  .stanza p { font-size: 1.15rem; }
  .stanza.dramatic p { font-size: 1.8rem; }
  .big-number-value { font-size: 3.2rem; }
  .closing-line { font-size: 2.8rem; }
  .chapter { padding: 64px 20px; }
  .img-pair { grid-template-columns: 1fr; }
  .stanza.highlight { padding: 24px 20px; }
  .code-block { padding: 16px 20px; }
}
</style>

<!-- Unscoped: Seuss candy-cane scrollbar (applied to html via class toggle) -->
<style>
.seuss-scrollbar::-webkit-scrollbar {
  width: 18px;
}

.seuss-scrollbar::-webkit-scrollbar-track {
  background: #0a0a0a;
}

.seuss-scrollbar::-webkit-scrollbar-thumb {
  border-radius: 10px;
  border: 2px solid #0a0a0a;
  background:
    repeating-linear-gradient(
      -45deg,
      #18befc 0px,
      #18befc 6px,
      #0d2a3a 6px,
      #0d2a3a 12px
    );
}

.seuss-scrollbar::-webkit-scrollbar-thumb:hover {
  background:
    repeating-linear-gradient(
      -45deg,
      #3dd4ff 0px,
      #3dd4ff 6px,
      #0f3548 6px,
      #0f3548 12px
    );
}

.seuss-scrollbar {
  scrollbar-width: auto;
  scrollbar-color: #18befc #0a0a0a;
}
</style>
