import {
  AutoTokenizer as _AutoTokenizer,
  PreTrainedTokenizer,
} from "./tokenizers/tokenizers";
import { NSTokenizerConfig, NSTokenizerJSON } from "./types";

interface ITokenizerModelJsonData {
  tokenizerJSON: Partial<NSTokenizerJSON.Root>;
  tokenizerConfig: Partial<NSTokenizerConfig.Root>;
}
interface ITokenizerModelUrls {
  tokenizerJSON: string;
  tokenizerConfig: string;
}

export class TokenizerLoader {
  /**
   * Creates a pre-trained tokenizer from the provided model data.
   *
   * @param {ITokenizerModelJsonData} model - The model data containing the tokenizer JSON and configuration.
   * @return {PreTrainedTokenizer} pre-trained tokenizer.
   * @throws {Error} If the tokenizer JSON or configuration is missing.
   */
  static fromPreTrained(model: ITokenizerModelJsonData): PreTrainedTokenizer {
    const { tokenizerJSON, tokenizerConfig } = model;
    if (!tokenizerJSON) {
      throw new Error("tokenizerJSON is required.");
    }
    if (!tokenizerConfig) {
      throw new Error("tokenizerConfig is required.");
    }
    // Some tokenizers are saved with the "Fast" suffix, so we remove that if present.
    const tokenizerName =
      tokenizerConfig.tokenizer_class?.replace(/Fast$/, "") ??
      "PreTrainedTokenizer";

    let cls = (_AutoTokenizer as any).TOKENIZER_CLASS_MAPPING[tokenizerName];
    if (!cls) {
      console.warn(
        `Unknown tokenizer class "${tokenizerName}", attempting to construct from base class.`
      );
      cls = PreTrainedTokenizer;
    }
    return new cls(tokenizerJSON, tokenizerConfig);
  }

  /**
   * Creates a pre-trained tokenizer from the provided model URLs.
   *
   * @param {ITokenizerModelUrls} model - The model URLs containing the tokenizer JSON and configuration.
   * @param {Object} [options] - Optional parameters.
   * @param {any} [options.fetch] - The fetch function to use for making HTTP requests. Defaults to global.fetch.
   * @param {Partial<ITokenizerModelJsonData>} [options.tokenizerJSON] - Additional tokenizer JSON data to merge with the fetched data.
   * @param {Partial<ITokenizerModelJsonData>} [options.tokenizerConfig] - Additional tokenizer configuration data to merge with the fetched data.
   * @return {Promise<PreTrainedTokenizer>} A promise that resolves to the pre-trained tokenizer.
   */
  static async fromPreTrainedUrls(
    model: ITokenizerModelUrls,
    options?: {
      fetch?: any;
    } & Partial<ITokenizerModelJsonData>
  ) {
    const fetch =
      (options?.fetch as typeof global.fetch) ??
      globalThis.fetch.bind(globalThis);
    const [tokenizerJSON, tokenizerConfig] = await Promise.all([
      fetch(model.tokenizerJSON).then((res) => res.json()),
      fetch(model.tokenizerConfig).then((res) => res.json()),
    ]);
    return TokenizerLoader.fromPreTrained({
      tokenizerJSON: {
        ...tokenizerJSON,
        ...options?.tokenizerJSON,
      },
      tokenizerConfig: {
        ...tokenizerConfig,
        ...options?.tokenizerConfig,
      },
    });
  }
}
