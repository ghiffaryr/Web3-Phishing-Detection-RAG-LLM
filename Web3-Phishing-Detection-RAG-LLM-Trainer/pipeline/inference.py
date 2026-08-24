import torch
from transformers import GenerationConfig


def predict(model, 
            dataset, 
            tokenizer, 
            is_peft=False,
            max_new_tokens=200,
            temperature=1.0,
            top_k=50,
            top_p=1.0,
            repetition_penalty=1.0):
    """Convert the predict function."""
    if is_peft:
        output_ids = model.generate(input_ids=torch.tensor(dataset['input_ids']),
                                    generation_config=GenerationConfig(max_new_tokens=max_new_tokens,
                                                                    temperature=temperature,
                                                                    top_k=top_k,
                                                                    top_p=top_p,
                                                                    repetition_penalty=repetition_penalty))
    else:
        output_ids = model.generate(
            input_ids=torch.tensor(dataset['input_ids']),
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_k=top_k,
            top_p=top_p,
            repetition_penalty=repetition_penalty
        )
    predictions = tokenizer.batch_decode(
        output_ids, skip_special_tokens=True
    )
    predictions = [
        1 if "spam" in predictions[i] else 0 for i in range(len(predictions))
    ]

    return predictions