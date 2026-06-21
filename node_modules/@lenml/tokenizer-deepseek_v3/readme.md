# @lenml/tokenizer-deepseek_v3

a tokenizer.

> based on `@lenml/tokenizers`

# Usage

```ts
import { fromPreTrained } from "@lenml/tokenizer-deepseek_v3";

const tokenizer = fromPreTrained();
console.log(
  "encode()",
  tokenizer.encode("Hello, my dog is cute", null, {
    add_special_tokens: true,
  })
);
console.log("_encode_text", tokenizer._encode_text("Hello, my dog is cute"));
```

# Full Tokenizer API

Complete api parameters and usage can be found in [transformer.js tokenizers document](https://huggingface.co/docs/transformers.js/v3.0.0/api/tokenizers)

# License

Apache-2.0
