from typing import Optional, Dict, Literal
import os
from utils.config import Config
from loguru import logger
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, AutoModelForCausalLM, AutoConfig, GenerationConfig, BitsAndBytesConfig
from peft import PeftConfig, PeftModel
from service.model_service import ModelService
from munch import munchify
import torch
import gc
import time

class ModelServiceImpl(ModelService):
    _instance = None

    def __init__(self):
        raise RuntimeError('Call instance() instead')

    @classmethod
    def instance(cls, 
                 model_name: str,
                 quantization: Literal["none", "4bit", "8bit"] = "8bit",  # Single parameter for quantization type
                 compute_dtype: torch.dtype = torch.bfloat16,
                 use_double_quant: bool = True,
                 quant_type: str = "nf4"):
        """
        Get or create a model service instance.
        
        Args:
            model_name: The name/path of the model to load
            quantization: Type of quantization to use ("none", "4bit", or "8bit")
                          8-bit is faster to load but less precise than 4-bit
            compute_dtype: Data type for computation (torch.float16 recommended for most GPUs)
            use_double_quant: Whether to use double quantization (for 4-bit only)
            quant_type: Quantization type ("nf4" or "fp4", for 4-bit only)
        """
        if cls._instance is not None:
            if model_name != cls._instance.model_name:
                # Unload the current model before loading a new one
                cls._instance.unload_model()
                cls._instance = None
        if cls._instance is None:
            cls._instance = cls.__new__(cls)
            cls._instance._init_instance(model_name=model_name, 
                                         quantization=quantization,
                                         compute_dtype=compute_dtype,
                                         use_double_quant=use_double_quant,
                                         quant_type=quant_type)
        return cls._instance

    def _init_instance(self, 
                       model_name: str,
                       quantization: str,
                       compute_dtype: torch.dtype,
                       use_double_quant: bool = True,
                       quant_type: str = "nf4"):
        self.model_name = model_name
        self.model = None
        self.tokenizer = None
        self.quantization = quantization.lower()  # Normalize to lowercase
        self.compute_dtype = compute_dtype
        self.use_double_quant = use_double_quant
        self.quant_type = quant_type
        self.initialize_model(model_name)

    def initialize_model(self, 
                         model_name: str) -> None:
        start_time = time.time()
        logger.info(f"Starting model initialization for {model_name}")
        
        # Force garbage collection before loading model
        gc.collect()
        torch.cuda.empty_cache()
        
        model_dir = "./" + Config.get().models.path + "/" + model_name.replace('/', '_')
        model_name = model_dir if os.path.exists(model_dir) else model_name

        config = munchify({"is_encoder_decoder": False})
        peft_config = munchify({"base_model_name_or_path": model_name})
        self.is_peft = False
        
        # Check if we can load from local cache first for better performance
        logger.info(f"Checking if model exists in local cache: {model_dir}")
        
        try:
            logger.info(f"Loading PEFT model configuration")
            peft_config = PeftConfig.from_pretrained(model_name, token=os.getenv("HF_TOKEN"))
            self.is_peft = True
            config = AutoConfig.from_pretrained(peft_config.base_model_name_or_path,
                                                trust_remote_code=True,
                                                use_auth_token=os.getenv("HF_TOKEN"))
        except Exception as e:
            logger.info(f"Not a PEFT model or error loading PEFT config: {e}")
            try:
                config = AutoConfig.from_pretrained(model_name,
                                                    trust_remote_code=True,
                                                    use_auth_token=os.getenv("HF_TOKEN"))
            except Exception as e:
                logger.error(f"Error loading model config: {e}")
                raise
            
        model_kwargs = {
            "trust_remote_code": True,
            "token": os.getenv("HF_TOKEN"),
            "device_map": "auto",
            "low_cpu_mem_usage": True,
            "use_safetensors": True,
            "torch_dtype": self.compute_dtype,  # Explicitly set default dtype
        }

        # Apply quantization based on the single parameter
        if self.quantization == "4bit":
            logger.info(f"Loading model with 4-bit precision (type: {self.quant_type}, double quant: {self.use_double_quant})")
            quantization_config = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_compute_dtype=self.compute_dtype,
                bnb_4bit_use_double_quant=self.use_double_quant,
                bnb_4bit_quant_type=self.quant_type
            )
            model_kwargs.update({
                "quantization_config": quantization_config
            })
        elif self.quantization == "8bit":
            logger.info("Loading model with 8-bit precision (faster loading)")
            quantization_config = BitsAndBytesConfig(
                load_in_8bit=True,
                bnb_8bit_compute_dtype=self.compute_dtype,
            )
            model_kwargs.update({
                "quantization_config": quantization_config
            })
        else:
            logger.info("Loading model without quantization (full precision)")

        logger.info(f"Model will be loaded with settings: {model_kwargs}")
        
        loading_start = time.time()
        if config.is_encoder_decoder:
            logger.info(f"Loading Seq2Seq model: {model_name}")
            self.model = AutoModelForSeq2SeqLM.from_pretrained(
                peft_config.base_model_name_or_path if self.is_peft else model_name, 
                **model_kwargs
            )
        else:
            logger.info(f"Loading Causal Language model: {model_name}")
            self.model = AutoModelForCausalLM.from_pretrained(
                peft_config.base_model_name_or_path if self.is_peft else model_name, 
                **model_kwargs
            )
        loading_time = time.time() - loading_start
        logger.info(f"Base model loaded in {loading_time:.2f} seconds")
        
        if self.is_peft:
            logger.info("Applying PEFT adapter")
            peft_start = time.time()
            self.model = PeftModel.from_pretrained(self.model, model_name).to("cuda:0")
            peft_time = time.time() - peft_start
            logger.info(f"PEFT adapter loaded in {peft_time:.2f} seconds")

        logger.info("Loading tokenizer")
        self.tokenizer = AutoTokenizer.from_pretrained(
            peft_config.base_model_name_or_path if self.is_peft else model_name, 
            trust_remote_code=True,
            token=os.getenv("HF_TOKEN"),
            use_fast=True  # Use fast tokenizer when available
        )
        
        # Load and save tokenizer separately to avoid re-loading model
        if not os.path.exists(model_dir):
            logger.info(f"Saving model to {model_dir} for faster loading next time")
            try:
                self.model.save_pretrained(model_dir, safe_serialization=True)
                self.tokenizer.save_pretrained(model_dir)
                logger.info(f"Model and tokenizer saved successfully to {model_dir}")
            except Exception as e:
                logger.error(f"Error saving model locally: {e}")
        
        total_time = time.time() - start_time
        logger.info(f"Model initialization completed in {total_time:.2f} seconds")

    def generate(self,
                prompt: str,
                context: Optional[int] = "",
                max_new_tokens: Optional[int] = 200,
                temperature: Optional[float] = 1.0,
                top_k: Optional[int] = 50,
                top_p: Optional[float] = 1.0,
                repetition_penalty: Optional[float] = 1.0
                ) -> dict:
       
        prompt_template = f"""
        {context}

        Use above context if useful.

        Please respond to the following task.

        {prompt}
        """ if context else f"""
        Please respond to the following task.

        {prompt}
        """
        inputs = self.tokenizer(prompt_template, return_tensors='pt').to(device="cuda:0")
        
        # Store the prompt token length to extract only model's response later
        prompt_token_length = inputs["input_ids"].shape[1]
        
        if self.is_peft:
            output_ids = self.model.generate(input_ids=inputs["input_ids"],
                                             generation_config=GenerationConfig(max_new_tokens=max_new_tokens,
                                                                                temperature=temperature,
                                                                                top_k=top_k,
                                                                                top_p=top_p,
                                                                                repetition_penalty=repetition_penalty))
        else:
            output_ids = self.model.generate(
                input_ids=inputs["input_ids"],
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_k=top_k,
                top_p=top_p,
                repetition_penalty=repetition_penalty
            )
        
        # Get the full output first
        full_completion = self.tokenizer.decode(output_ids[0], skip_special_tokens=True)
        
        # Extract only the newly generated tokens (model's actual response)
        response_only_ids = output_ids[0][prompt_token_length:]
        completion = self.tokenizer.decode(response_only_ids, skip_special_tokens=True)
        
        # If the token-based approach strips too much, fall back to string-based trimming
        if not completion.strip():
            # Remove the prompt template using string operations
            lines = full_completion.split('\n')
            prompt_lines = prompt_template.count('\n') + 1
            completion = '\n'.join(lines[prompt_lines:]).strip()
        
        # Clean up any separator lines (like dashed lines) that might come from the model
        completion = self.clean_model_output(completion)
        
        result = {
            'completion': completion
        }

        return result
        
    def clean_model_output(self, text: str) -> str:
        """Clean up separator lines or artifacts in the model output including lines starting with < and ending with >."""
        import re
        
        lines = text.split('\n')
        cleaned_lines = []
        
        # Only apply filtering to the first 5 lines
        for i, line in enumerate(lines):
            if i < 5:
                stripped_line = line.strip()
                # Skip lines that are just dashes
                if re.match(r'^-+$', stripped_line):
                    continue
                # Skip lines that start with < and end with >
                if re.match(r'^\s*<.*>\s*$', stripped_line):
                    continue
            # Always append lines after the first 5
            cleaned_lines.append(line)
        
        return '\n'.join(cleaned_lines)
    
    def unload_model(self) -> None:
        """Unload the model from GPU to free up memory."""
        if self.model is not None:
            logger.info(f"Unloading model {self.model_name} from GPU")
            try:
                # Move model to CPU first
                self.model.to("cpu")
                
                # Delete model and tokenizer references
                del self.model
                del self.tokenizer
                
                # Run garbage collection and clear CUDA cache
                gc.collect()
                torch.cuda.empty_cache()
                
                self.model = None
                self.tokenizer = None
                logger.info("Model unloaded and GPU memory cleared")
            except Exception as e:
                logger.error(f"Error unloading model: {e}")