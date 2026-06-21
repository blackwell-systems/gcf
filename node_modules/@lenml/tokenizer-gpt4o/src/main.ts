import { tokenizerJSON, tokenizerConfig } from "./data";
import {
  TokenizerLoader,
  TokenizerClassNameMapping,
  FromPreTrainedFn,
  tokenizers,
} from "@lenml/tokenizers";

/**
 * Build a tokenizer from a pre-trained model.
 */
export const fromPreTrained: FromPreTrainedFn<
  TokenizerClassNameMapping<"GPT2Tokenizer">
> = (params) => {
  return TokenizerLoader.fromPreTrained({
    tokenizerJSON: {
      ...tokenizerJSON,
      ...params?.tokenizerJSON,
    },
    tokenizerConfig: {
      ...tokenizerConfig,
      ...params?.tokenizerConfig,
    },
  }) as any;
};

export { tokenizerJSON, tokenizerConfig, tokenizers, TokenizerLoader };
