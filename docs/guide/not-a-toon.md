# Not a TOON

*A cautionary tale about wire formats, for engineers of all ages.*

---

Would you send it as JSON?
Would you send it with TOON?

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

I tried it with YAML.
TOON said: "I can't eat that."
I tried it with TOML.
TOON said: "I can't read that."
I tried CSV.
TOON said: "What is that?"
I tried MessagePack.
TOON fled from the chat.

---

So I tried it with GCF.
I tried it one night.
The header said `generic`.
The rows were packed tight.

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

TOON had no IDs.
TOON had no edges.
TOON wrote `github.com/org/repo/pkg.AuthMiddleware`
on every line, building ledges
of tokens so tall
that the context filled up
before it said anything
useful at all.

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

Thirty-three billion.
33,000,000,000.
Round-trips through five formats,
every language, every one.

JSON: eleven billion.
YAML: eleven billion too.
MessagePack, CSV, TOML:
a billion between the few.

Six languages tested.
Go, Rust, TypeScript, Python,
Swift, Kotlin: all passing.
Not a single byte bitten.

Zero failures.
Not one in twenty-three billion tries.
TOON published... no fuzz data.
No round-trips. No tries.

---

"But humans can't READ it!"
they said with dismay.
"It's dense! It's compact!
It's not readable that way!"

Neither is protobuf.
Neither are gzip bytes.
You don't read the wire format.
You read what it writes.

`decode()` at the end.
One function call away.
The human sees JSON.
The agent sees GCF all day.

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

I would send it with GCF.
I would send it today.
In JSON or YAML
or TOML or CSV,
in MessagePack binary,
in any which way.

GCF takes your data,
whatever the source.
GCF packs it tight
on a lossless course.

Thirty-three billion times tested.
Six languages strong.
One hundred percent comprehension.

The *-OONs were wrong.

---

*[Try it yourself.](https://gcformat.com/playground.html) Paste any format. Watch GCF win.*

*[See the benchmarks.](https://gcformat.com/guide/benchmarks.html) 1,700+ LLM evaluations. Every frontier model. Every format.*

*[Read the spec.](https://gcformat.com/reference/spec.html) v3.1. Stable. Six implementations. 157 conformance fixtures.*
