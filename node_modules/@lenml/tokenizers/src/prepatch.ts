import { AutoTokenizer, PreTrainedTokenizer } from "./tokenizers/tokenizers";

// NOTE: Set this to turn off the warning of claude tokenizer
// @ts-ignore
AutoTokenizer.TOKENIZER_CLASS_MAPPING.ClaudeTokenizer = PreTrainedTokenizer;
