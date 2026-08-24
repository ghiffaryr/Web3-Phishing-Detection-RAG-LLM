# LLM Backend API for Seq2Seq and Causal LM Architecture Model

## Configuration Steps
1. Install Docker and start
2. Create environment variables ".env" by referencing to ".env.default"
3. Run below command on terminal
`
docker-compose up --build
`
4. API can be hit based on the host and port you set on .env file and open postman collection json for API route references

## Example
1. You can use the last model i trained at [ghiffaryr/phishing-detection-peft-q_model-google_flan-t5-base_dataset-phishingpot_csdmc_train-0.8_seed-0](ghiffaryr/phishing-detection-peft-q_model-google_flan-t5-base_dataset-phishingpot_csdmc_train-0.8_seed-0)
2. Or may use RAG
   
To upload the file into our system
`
HOST:PORT/api/v1/file/upload
`

To update the ChromaDB database
`
HOST:PORT/api/v1/chroma/update
`

To do batch update of ChromaDB database
`
HOST:PORT/api/v1/chroma/batch_update
`

Generate context using RAG
`
HOST:PORT/api/v1/rag/generate_context
`
