import os
from loguru import logger
from pathlib import Path
from transformers import AutoConfig, BitsAndBytesConfig, AutoModelForSeq2SeqLM, AutoModelForCausalLM, TrainingArguments, Trainer
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, TaskType
import torch
from tqdm import tqdm
tqdm.pandas()
from utils.config import Config


def setup(model_name, 
                dataset, 
                experiment_name, 
                is_peft=True, 
                is_quantization=True, 
                r=32,
                lora_alpha=32,
                target_modules=[],
                lora_dropout=0.05,
                bias="none",
                resume_from_checkpoint=True,
                auto_find_batch_size=True,
                logging_steps=1,
                max_steps=-1,
                num_train_epochs=1,
                learning_rate=5e-5,
                weight_decay=0.01,
                run_name=None,
                fp16=False,
                fp16_full_eval=False,
                hub_private_repo=False,
                push_to_hub=False):
    """Return a trainer object for transformer models."""
    config = AutoConfig.from_pretrained(model_name,
                                        trust_remote_code=True)
    
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16
    )

    def print_number_of_trainable_model_parameters(model):
        trainable_model_params = 0
        all_model_params = 0
        for _, param in model.named_parameters():
            all_model_params += param.numel()
            if param.requires_grad:
                trainable_model_params += param.numel()
        return f"trainable model parameters: {trainable_model_params}\nall model parameters: {all_model_params}\npercentage of trainable model parameters: {100 * trainable_model_params / all_model_params:.2f}%"

    if is_quantization:
        if config.is_encoder_decoder:
            logger.info(f"Loading base Seq2Seq model: {model_name}")
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name,
                                                               quantization_config=bnb_config, 
                                                               trust_remote_code=True,
                                                               token=os.getenv("HF_TOKEN"))
        else:
            logger.info(f"Loading base Causal Language model: {model_name}")
            model = AutoModelForCausalLM.from_pretrained(model_name,
                                                              quantization_config=bnb_config, 
                                                              trust_remote_code=True,
                                                              token=os.getenv("HF_TOKEN"))
    else:
        if config.is_encoder_decoder:
            logger.info(f"Loading Seq2Seq model: {model_name}")
            model = AutoModelForSeq2SeqLM.from_pretrained(model_name, 
                                                                trust_remote_code=True,
                                                                token=os.getenv("HF_TOKEN"))
        else:
            logger.info(f"Loading Causal Language model: {model_name}")
            model = AutoModelForCausalLM.from_pretrained(model_name, 
                                                                trust_remote_code=True,
                                                                token=os.getenv("HF_TOKEN"))
    
    if is_peft:
        lora_config = LoraConfig(
            r=r,
            lora_alpha=lora_alpha,
            target_modules=target_modules,
            lora_dropout=lora_dropout,
            bias=bias,
            task_type=TaskType.SEQ_2_SEQ_LM if config.is_encoder_decoder else TaskType.CAUSAL_LM
        )
        model.gradient_checkpointing_enable()
        model = prepare_model_for_kbit_training(model)
        model = get_peft_model(model,
                            lora_config)
        
    logger.info(print_number_of_trainable_model_parameters(model))

    output_dir = Path(Config.get().model.experiments.path) / Path("history") / Path(experiment_name)

    training_args = TrainingArguments(
        output_dir=output_dir,
        resume_from_checkpoint=resume_from_checkpoint,
        auto_find_batch_size=auto_find_batch_size,
        logging_steps=logging_steps,
        max_steps=max_steps,
        num_train_epochs=num_train_epochs,
        learning_rate=learning_rate,
        fp16=fp16,
        fp16_full_eval=fp16_full_eval,
        weight_decay=weight_decay,
        run_name=run_name,
        hub_private_repo=hub_private_repo,
        push_to_hub=push_to_hub
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset['train'],
        eval_dataset=dataset['validation']
    )
    
    model.config.use_cache = False

    return trainer, model

