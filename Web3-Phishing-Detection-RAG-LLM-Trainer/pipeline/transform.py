def binary_tokenize(dataset, 
                    tokenizer, 
                    instruction, 
                    label_0,
                    label_1,
                    padding="max_length"):
    """Tokenize dataset"""
    if tokenizer is None:
        return dataset   

    # Extra step to convert our 0/1 labels into strings
    dataset = dataset.map(
        lambda x: {"label": label_0 if x["label"] == 0 else label_1})

    # Calculate the max label length after tokenization
    tokenized_label = dataset.map(
        lambda x: tokenizer(x["label"], truncation=True), batched=True)
    max_label_length = max([len(x) for x in tokenized_label["input_ids"]])

    def formatter(examples):
        # Instruction tuning
        text = [instruction + item for item in examples["text"]]

        # Tokenize text and labels
        inputs = tokenizer(text, max_length=tokenizer.model_max_length,
                           padding=padding, truncation=True)
        labels = tokenizer(
            text_target=examples["label"], max_length=max_label_length, padding=True, truncation=True)

        # Replace tokenizer.pad_token_id in the labels by -100 to ignore padding in the loss
        inputs["labels"] = [
            [(x if x != tokenizer.pad_token_id else -100) for x in label] for label in labels["input_ids"]
        ]
        return inputs    

    return dataset.map(formatter, batched=True, remove_columns=["label"])
