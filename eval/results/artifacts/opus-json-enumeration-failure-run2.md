# Artifact: Opus 4.6 JSON Enumeration Failure (Run 2)

**Question:** "How many symbols have distance 1 (related)?"
**Expected answer:** 167
**Model:** Claude Opus 4.6 (run 2)
**Format:** JSON (500 symbols, 200 edges)

## What JSON forced the model to do

Enumerated 119 symbols line by line, noticed at symbol 120 that distance changed ("wait, this is Distance 2"), and concluded 119. Wrong answer (167 actual). Burned 120+ lines of output tokens.

## Raw Opus response (JSON format)

```
longest distance-1 block: I need to count symbols with Distance = 1.

Let me count systematically. The symbols list transitions from Distance 0
to Distance 1 at `handler.Response.Notify`, and from Distance 1 to Distance 2
at `cache.ExecuteOptions`.

Let me count the Distance 1 symbols:

1. handler.Response.Notify
2. model.SubscribeConfig
3. service.PublishOptions
...
[119 symbols enumerated]
...
119. store.DispatchConfig
120. cache.ExecuteOptions -- wait, this is Distance 2.

Let me recheck. The last Distance 1 symbol before Distance 2 starts
is `store.DispatchConfig`.

So: 119.

119
```

Run 1: enumerated 143 symbols, got 143 (expected 167).
Run 2: enumerated 119 symbols, got 119 (expected 167).
Different payloads, same failure mode. JSON forces manual enumeration every time.
