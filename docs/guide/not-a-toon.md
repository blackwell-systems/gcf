<div class="poem-page">

# Not a TOON

*A cautionary tale about wire formats, for engineers of all ages.*

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-hero.png" alt="Five data formats flow into the GCF funnel while TOON watches" style="max-width: 700px; width: 100%; border-radius: 12px;" />
</div>

---

Would you send it as JSON?
Would you send it with TOON?

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-fork-road.png" alt="A fork in the road: JSON or TOON?" style="max-width: 500px; width: 100%; border-radius: 12px;" />
</div>

I would not send it as JSON.
Not with all of those braces,
not with all of those quotes,
not with fifty-three thousand
redundant key-notes.

"But TOON!" said the vendor.
"TOON's smaller!" they cried.
"TOON folds all your keys
and puts commas inside!"

So I tried it with TOON.
I tried it one day.
I sent it five hundred
symbols that way.

And TOON lost the count.
TOON bungled the call.
On GPT-5.5,
TOON failed on them all.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-bungled-count.png" alt="TOON at the chalkboard with wrong numbers, robots holding red X cards" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

I tried it with YAML.
TOON said: "I can't eat that."
I tried it with TOML.
TOON said: "I can't read that."
I tried CSV.
TOON said: "What is that?"
I tried MessagePack.
TOON fled from the chat.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-yaml-plate.png" alt="A friendly character offers YAML on a plate, TOON refuses" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-fled-chat.png" alt="Five format characters chase TOON who runs in panic" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

---

So I tried it with GCF.
I tried it one night.
The header said `generic`.
The rows were packed tight.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-discovery.png" alt="Late night discovery: GCF profile=generic glows above a desk with compact rows" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

`## orders [10]{id,total,status}`
`1001|249.99|shipped`

No braces. No colons.
No keys on each line.
Just fields declared once
and the data looked fine.

But could it do YAML?
(I had YAML to send.)
GCF parsed it and packed it.
TOON said: "That's the end."

Could it do TOML?
(A Cargo.toml, fifteen crates deep.)
GCF tabularized it.
TOON went back to sleep.

Could it do CSV?
(Twenty rows, eight columns wide.)
GCF took it directly.
TOON ran off to hide.

Could it do MessagePack?
(Binary, base64, the works.)
GCF decoded and encoded.
TOON said: "That format irks."

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-gameshow.png" alt="GCF on stage as formats enter with questions and leave with checkmarks" style="max-width: 700px; width: 100%; border-radius: 12px;" />
</div>

---

"But wait!" said the vendor.
"Can your format do graphs?
Can it handle the edges?
Can it handle the paths?"

`@0 fn pkg.AuthMiddleware 0.92 lsp`
`@1 fn pkg.ValidateToken 0.87 lsp`
`@0<@1 calls`

Four tokens per edge.
Not thirty. Not ninety.
Local IDs, not full names
repeated so fighty.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-4-vs-90.png" alt="A tiny 4-plank bridge vs a massive sagging 90-plank bridge" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

TOON had no IDs.
TOON had no edges.
TOON wrote `github.com/org/repo/pkg.AuthMiddleware`
on every line, building ledges
of tokens so tall
that the context filled up
before it said anything
useful at all.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-no-ids.png" alt="TOON's collapsing tower of repeated identifiers vs GCF's compact @0 @1 @2 blocks" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

---

"But wait!" said the vendor.
"What about call two?
The SAME symbols again,
what does YOUR format do?"

`@0  # previously transmitted`
`@1  # previously transmitted`
`@2  # previously transmitted`

Call one: full payload.
Call five: ninety-two percent bare.
TOON sent the whole thing again.
Every symbol. Every pair.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-session-dedup.png" alt="GCF delivers less each call while TOON carries the same huge sack every time" style="max-width: 700px; width: 100%; border-radius: 12px;" />
</div>

"Session dedup," I explained,
"tracks what's been sent."
TOON had no sessions.
TOON had no concept.
TOON re-sent everything,
every single event.

---

"But is it LOSSLESS?" they asked,
with a skeptical frown.
"Can you prove that it works
when the data goes down
through encode and decode
and back up again?
With no bits lost or mangled
or misplaced, and then..."

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-prove-it.png" alt="Skeptical judges demand proof while GCF sits calmly before a wall of 33 billion evidence" style="max-width: 700px; width: 100%; border-radius: 12px;" />
</div>

Thirty-three billion.
33,000,000,000.
Round-trips through five formats,
every language, every one.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-33-billion.png" alt="A towering stack of 33 billion round-trips with a green checkmark" style="max-width: 500px; width: 100%; border-radius: 12px;" />
</div>

JSON: eleven billion.
YAML: eleven billion too.
MessagePack, CSV, TOML:
a billion between the few.

Six languages tested.
Go, Rust, TypeScript, Python,
Swift, Kotlin: all passing.
Not a single byte bitten.

Zero failures.
Not one in thirty-three billion tries.
TOON published... no fuzz data.
No round-trips. No tries.

---

"But humans can't READ it!"
they said with dismay.
"It's dense! It's compact!
It's not readable that way!"

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-humans-cant-read.png" alt="Humans panic while a robot reads GCF at 100% with tea" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

Neither is protobuf.
Neither are gzip bytes.
You don't read the wire format.
You read what it writes.

`decode()` at the end.
One function call away.
The human sees JSON.
The agent sees GCF all day.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-agent-human-decode.png" alt="The Agent reads GCF efficiently, decode() transforms it, The Human reads JSON comfortably" style="max-width: 700px; width: 100%; border-radius: 12px;" />
</div>

The context window savings?
Already banked, already done.
The model reads it at one hundred percent.
JSON drops to fifty-three point one.

---

So would you send it as JSON?

I would not.

Would you send it with TOON?

I could not, would not, with a TOON.
Not a TOON, not a PLOON,
not a BLOON or a SPOON.
Not with any format
that ends with *-OON.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-oons-wrong.png" alt="TOON, PLOON, BLOON, and SPOON defeated on a bench while GCF glows on the podium" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

I would send it with GCF.
I would send it today.
In JSON or YAML
or TOML or CSV,
in MessagePack binary,
in any which way.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-parade.png" alt="GCF leads a victory parade with all five format characters" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

GCF takes your data,
whatever the source.
GCF packs it tight
on a lossless course.

Thirty-three billion times tested.
Six languages strong.
One hundred percent comprehension.

The *-OONs were wrong.

<div style="text-align: center; margin: 2rem 0;">
  <img src="/not-a-toon-closing.png" alt="The OONs were wrong - GCF triumphant with five format streams" style="max-width: 600px; width: 100%; border-radius: 12px;" />
</div>

---

*[Try it yourself.](https://gcformat.com/playground.html) Paste any format. Watch GCF win.*

*[See the benchmarks.](https://gcformat.com/guide/benchmarks.html) 1,700+ LLM evaluations. Every frontier model. Every format.*

*[Read the spec.](https://gcformat.com/reference/spec.html) v3.1. Stable. Six implementations. 157 conformance fixtures.*

</div>
