# LLM Trainer for Binary Classification

## Configuration Steps
1. Install Python 3.10, preferably using Conda
2. Update pip package manager to the latest version by
`
pip install --upgrade pip
`
3. Install Pipenv for Python isolated environment (pip and virtualenv) by
`
pip uninstall virtualenv && pip install pipenv --user && sudo apt install pipenv
`
4. In current working directory, create and enter pipenv shell
`
pipenv shell
`
5. Install dependencies
`
pipenv install
`
6. Create environment variables ".env" by referencing to ".env.default"
7. Configure project in the main.py
8. Start training and inference
`
python main.py
`
9. Inference summary path can be seen on resources/config.yml

# Result
Dataset: CSDMC 2010 and Phishing Pot
| project_name                   | dataset_size | train_size | validation_size | test_size | test_cm                   | test_ncm_pred                           | test_ncm_true                           | test_balanced_accuracy | test_accuracy | test_f1          | test_precision   | test_recall      | test_roc_auc      | model_name        | dataset_name     | experiment_name                                                                                         | repo_name                                     | label_0 | label_1 |
|--------------------------------|--------------|------------|-----------------|-----------|---------------------------|------------------------------------------|------------------------------------------|------------------------|---------------|------------------|------------------|------------------|------------------|-------------------|------------------|---------------------------------------------------------------------------------------------------------|------------------------------------------------|---------|---------|
| phishing-detection-rag-llm-peft-q | 5540         | 4432       | 554             | 554       | [[269, 8], [3, 274]]      | [[0.989, 0.028], [0.011, 0.972]]       | [[0.971, 0.029], [0.011, 0.989]]       | 0.9801444043321299     | 0.98014440433213 | 0.9801427868526611 | 0.9803008969545264 | 0.98014440433213 | 0.9801444043321299 | google/flan-t5-base | phishingpot_csdmc | phishing-detection-rag-llm-peft-q_model-google_flan-t5-base_dataset-phishingpot_csdmc_train-0.8_seed-0 | phishing-detection-rag-llm-peft-q-phishingpot_csdmc | ham     | spam    |
