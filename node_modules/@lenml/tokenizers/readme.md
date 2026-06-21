# @lenml/tokenizers

a lightweight no-dependency fork from transformers.js (only tokenizers)

- github: https://github.com/lenML/tokenizers
- tokenizers-arena: https://lenml.github.io/tokenizers-arena/#/side-by-side

# Usage

## install

### npm/yarn/pnpm

```
npm install @lenml/tokenizers
```

### ESM

```html
<script type="importmap">
  {
    "imports": {
      "@lenml/tokenizers": "https://www.unpkg.com/@lenml/tokenizers@latest/dist/main.mjs"
    }
  }
</script>
<script type="module">
  import { TokenizerLoader, tokenizers } from "@lenml/tokenizers";
  console.log("@lenml/tokenizers: ", tokenizers);
</script>
```

## load tokenizer

### from json

```ts
import { TokenizerLoader } from "@lenml/tokenizers";
const tokenizer = TokenizerLoader.fromPreTrained({
  tokenizerJSON: {
    /* ... */
  },
  tokenizerConfig: {
    /* ... */
  },
});
```

### from urls

```ts
import { TokenizerLoader } from "@lenml/tokenizers";
const sourceUrls = {
  tokenizerJSON:
    "https://huggingface.co/HuggingFaceH4/zephyr-7b-gemma-v0.1/resolve/main/tokenizer.json?download=true",
  tokenizerConfig:
    "https://huggingface.co/HuggingFaceH4/zephyr-7b-gemma-v0.1/resolve/main/tokenizer_config.json?download=true",
};
const tokenizer = await TokenizerLoader.fromPreTrainedUrls(sourceUrls);
// or from fetch
const tokenizer = TokenizerLoader.fromPreTrained({
  tokenizerJSON: await fetch(sourceUrls.tokenizerJSON).then((r) => r.json()),
  tokenizerConfig: await fetch(sourceUrls.tokenizerConfig).then((r) =>
    r.json()
  ),
});
```

### from pre-packaged tokenizer

```ts
import { fromPreTrained } from "@lenml/tokenizer-llama3";
const tokenizer = fromPreTrained();
```

## chat template

```ts
const tokens = tokenizer.apply_chat_template([
  {
    role: "system",
    content: "You are helpful assistant.",
  },
  {
    role: "user",
    content: "Hello, how are you?",
  },
]) as number[];

const chat_content = tokenizer.decode(tokens);

console.log(chat_content);
```

output:

```
<|begin_of_text|><|start_header_id|>system<|end_header_id|>

You are helpful assistant.<|eot_id|><|start_header_id|>user<|end_header_id|>

Hello, how are you?<|eot_id|><|start_header_id|>assistant<|end_header_id|>
```

## tokenizer api

```ts
console.log(
  "encode() => ",
  tokenizer.encode("Hello, my dog is cute", null, {
    add_special_tokens: true,
  })
);
console.log(
  "_encode_text() => ",
  tokenizer._encode_text("Hello, my dog is cute")
);
```

> fully tokenizer api: [transformer.js tokenizers document](https://huggingface.co/docs/transformers.js/v3.0.0/api/tokenizers)

## get lightweight `transformers.tokenizers`

In the `@lenml/tokenizers` package, you can get a lightweight no-dependency implementation of tokenizers:

> Since all dependencies related to huggingface have been removed in this library, although the implementation is the same, it is not possible to load models using the form `hf_user/repo`.

```ts
import { tokenizers } from "@lenml/tokenizers";

const {
  CLIPTokenizer,
  AutoTokenizer,
  CohereTokenizer,
  VitsTokenizer,
  WhisperTokenizer,
  // ...
} = tokenizers;
```

# License

Apache-2.0
