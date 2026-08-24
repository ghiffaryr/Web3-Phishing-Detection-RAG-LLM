from pathlib import Path
from utils.config import Config
from utils.state import set_seed
from pipeline.dataset import get_dataset, train_validation_test_split
from pipeline.training import setup
from pipeline.transform import binary_tokenize
from pipeline.inference import predict
from datasets import  DatasetDict
from transformers import AutoTokenizer
import os
import time
from datetime import datetime
from loguru import logger
from sklearn.metrics import (
    balanced_accuracy_score,
    accuracy_score,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    confusion_matrix
)
import pandas as pd
from pipeline.evaluate import statistics


if __name__ == "__main__":
    
    # Define configuration
    seed = 0
    project_name = "phishing-detection-rag-llm"
    model_name = "google/flan-t5-base"
    dataset_name = "phishingpot_csdmc"
    train_size = 0.8
    is_peft = True
    is_quantization = True
    instruction = "Classify as ham or spam:\n\n"
    label_0 = "ham"
    label_1 = "spam"
    metrics = {
        "confusion_matrix": confusion_matrix,
        "balanced_accuracy": balanced_accuracy_score,
        "accuracy": accuracy_score,
        "f1": f1_score,
        "precision": precision_score,
        "recall": recall_score,        
        "roc_auc": roc_auc_score        
    }

    # Configuring
    if is_peft: project_name += "-peft"
    if is_quantization: project_name += "-q"
    experiment_name = f"{project_name}_model-{model_name.replace('/','_')}_dataset-{dataset_name}_train-{train_size}_seed-{seed}"
    repo_name = project_name + "-" + dataset_name    

    # Apply seed
    set_seed(seed)    

    # Retrieve dataset and preprocess
    df = get_dataset(dataset_name).dropna()
    _, dataset = train_validation_test_split(
            df, train_size=train_size, has_validation=True
        )

    # Tokenize
    tokenizer = AutoTokenizer.from_pretrained(model_name, 
                                                trust_remote_code=True,
                                                token=os.getenv("HF_TOKEN"))
    
    tokenized_dataset = DatasetDict({
        "train": binary_tokenize(dataset=dataset["train"], 
                                 tokenizer=tokenizer,
                                 instruction=instruction,
                                 label_0=label_0,
                                 label_1=label_1),
        "validation": binary_tokenize(dataset=dataset["validation"], 
                                      tokenizer=tokenizer,
                                      instruction=instruction,
                                      label_0=label_0,
                                      label_1=label_1),
        "test": binary_tokenize(dataset=dataset["test"], 
                                tokenizer=tokenizer,
                                instruction=instruction,
                                label_0=label_0,
                                label_1=label_1)
    })
    
    
    # Setup trainer
    trainer, model = setup(model_name=model_name,
            dataset=tokenized_dataset,
            experiment_name=experiment_name,
            is_peft=is_peft,
            is_quantization=is_quantization,
            r=8,
            lora_alpha=32,
            target_modules=["q", "v"],
            lora_dropout=0.05,
            bias="none",
            resume_from_checkpoint=True,
            auto_find_batch_size=True,
            logging_steps=1,
            max_steps=-1,
            num_train_epochs=1,
            learning_rate=5e-5,
            weight_decay=0.01,
            run_name=f"{experiment_name}-{datetime.now().strftime('%Y-%m-%d-%H-%M')}",
            fp16=False,
            fp16_full_eval=False,
            hub_private_repo=True,
            push_to_hub=True)
    
    # Train
    start = time.time()
    train_result = trainer.train()
    end = time.time()
    training_time = end - start
    logger.info("Training time: ",training_time)

    # Save Model
    model_dir = Path(Config.get().model.experiments.path) / Path(experiment_name)
    model.save_pretrained(model_dir)

    # Evaluate
    start = time.time()
    predictions = predict(
        model=model, 
        dataset=tokenized_dataset["test"], 
        tokenizer=tokenizer,
        is_peft=is_peft,
        max_new_tokens=200,
        temperature=1.0,
        top_k=50,
        top_p=1.0,
        repetition_penalty=1.0
    )
    end = time.time()

    results = []
    result = {}
    result["project_name"] = project_name
    result["dataset_size"] = len(df)
    result["train_size"] = int(train_size * len(df))
    result["validation_size"] = int((len(df)-result["train_size"]) / 2)
    result["test_size"] = int((len(df)-result["train_size"]) / 2)
    result.update(statistics(metrics, 
                             dataset=dataset["test"]["label"], 
                             predictions=predictions, 
                             prefix="test_"))
    result["model_name"] = model_name
    result["dataset_name"] = dataset_name    
    result["experiment_name"] = experiment_name
    result["repo_name"] = repo_name
    result["label_0"] = label_0
    result["label_1"] = label_1
    results.append(result)

    results_df = pd.DataFrame(results)
    current_data_summary_path = Path(Config.get().data.summary.path) / Path(project_name)
    current_data_summary_path.mkdir(parents=True, exist_ok=True)
    results_df.to_csv( current_data_summary_path / Path(f"{experiment_name}.csv"), index=False)

