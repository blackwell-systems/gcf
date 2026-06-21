import type {
  AutoTokenizer,
  PreTrainedTokenizer,
} from "./tokenizers/tokenizers";

export type TokenizerMapping = typeof AutoTokenizer.TOKENIZER_CLASS_MAPPING;
export type SupportedTokenizerClasses = keyof TokenizerMapping;
export type TokenizerClassNameMapping<T extends string> =
  T extends SupportedTokenizerClasses
    ? InstanceType<TokenizerMapping[T]>
    : PreTrainedTokenizer;

export type TokenizerConfigMapping<
  Config extends {
    tokenizer_class: string;
  }
> = Config["tokenizer_class"] extends SupportedTokenizerClasses
  ? TokenizerMapping[Config["tokenizer_class"]]
  : PreTrainedTokenizer;

type ValueOf<T> = T[keyof T];

export type FromPreTrainedFn<
  M extends InstanceType<ValueOf<TokenizerMapping>>
> = (params?: {
  // TODO: types
  tokenizerJSON?: Partial<NSTokenizerJSON.Root>;
  tokenizerConfig?: Partial<NSTokenizerConfig.Root>;
}) => M;

export namespace NSTokenizerConfig {
  // TODO full types
  export type Root = {
    add_prefix_space?: any;
    bos_token?: any;
    clean_up_tokenization_spaces: boolean;
    eos_token: any;
    model_max_length: number;
    tokenizer_class: string;
    unk_token: any;
    chat_template?: any;
    add_bos_token?: boolean;
    add_eos_token?: boolean;
    added_tokens_decoder?: { [key: string]: AddedTokensDecoder };
    legacy?: boolean | null;
    merges_file?: null;
    pad_token?: any;
    sp_model_kwargs?: any;
    spaces_between_special_tokens?: boolean;
    use_default_system_prompt?: boolean;
    vocab_file?: null;
    auto_map?: any;
    do_lower_case?: boolean;
    padding_side?: string;
    remove_space?: boolean;
    additional_special_tokens?: string[];
    errors?: string;
    split_special_tokens?: boolean;
  };

  export type AddedTokensDecoder = {
    content: string;
    lstrip: boolean;
    normalized: boolean;
    rstrip: boolean;
    single_word: boolean;
    special: boolean;
  };

  export type AutoMap = {
    AutoTokenizer: Array<null | string>;
  };

  export type ChatTemplateElement = {
    name: string;
    template: string;
  };

  export type SPModelKwargs = {};
}

export namespace NSTokenizerJSON {
  // TODO full types
  export type Root = {
    version: string;
    truncation: null;
    padding: null;
    added_tokens: any[];
    normalizer: any;
    pre_tokenizer: any;
    post_processor: any;
    decoder: any;
    model: any;
  };

  export type AddedToken = {
    id: number;
    content: string;
    single_word: boolean;
    lstrip: boolean;
    rstrip: boolean;
    normalized: boolean;
    special: boolean;
  };

  export type PretokenizerElement = {
    type: string;
    decoders?: DecoderDecoder[];
    add_prefix_space?: boolean;
    trim_offsets?: boolean;
    use_regex?: boolean;
    individual_digits?: boolean;
  };

  export type DecoderDecoder = {
    type: string;
    pattern?: Pattern;
    content?: string;
    start?: number;
    stop?: number;
  };

  export type Pattern = {
    String: string;
  };

  export type Model = {
    type: string;
    dropout: null;
    unk_token: any;
    continuing_subword_prefix: null;
    end_of_word_suffix: null;
    fuse_unk: boolean;
    byte_fallback: boolean;
    vocab: { [key: string]: number };
    merges: string[];
  };

  export type TopLevelNormalizer = {
    type: string;
    normalizers?: NormalizerElement[];
  };

  export type NormalizerElement = {
    type: string;
    prepend?: string;
    pattern?: Pattern;
    content?: string;
  };

  export type PostProcessor = {
    type: string;
    single: Pair[];
    pair: Pair[];
    special_tokens: { [key: string]: SpecialToken };
    add_prefix_space?: boolean;
    trim_offsets?: boolean;
    use_regex?: boolean;
  };

  export type Pair = {
    SpecialToken?: Sequence;
    Sequence?: Sequence;
  };

  export type Sequence = {
    id: string;
    type_id: number;
  };

  export type SpecialToken = {
    id: string;
    ids: number[];
    tokens: string[];
  };

  export type PreTokenizer = {
    type: string;
    pretokenizers?: PretokenizerElement[];
  };
}
