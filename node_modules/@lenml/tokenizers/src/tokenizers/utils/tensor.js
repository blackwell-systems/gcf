export class TensorError extends Error {
  constructor(message) {
    super(message);
  }
}

export class Tensor {
  /**
   * Create a new Tensor or copy an existing Tensor.
   *
   * *JUST PLACEHOLDER
   */
  constructor(...args) {
    throw new TensorError(
      `You seem to be creating a tensor object. Unfortunately, the '@lenml/tokenizers' library does not support returning any ONNX-related object instances. Please try setting 'return_tensor=false' to avoid this error`
    );
  }
}
