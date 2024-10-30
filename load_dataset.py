# Run: pip install cohere datasets
import json
from datasets import load_dataset

docs = load_dataset(
    "Cohere/wikipedia-22-12-simple-embeddings",
    split="train",
    streaming=True,
    # https://huggingface.co/datasets/Cohere/wikipedia-22-12-simple-embeddings?row=2
)

iteration = 0


for doc in docs:
    with open(f'dataset/{doc["id"]}.json', "w+") as fp:
        document = {}
        try:
            document = json.load(fp)
            document["chunks"][doc["paragraph_id"]] = {
                "text": doc["text"],
                "embedding": doc["emb"],
            }
        except:
            document = {
                "chunks": {
                    doc["paragraph_id"]: {
                        "text": doc["text"],
                        "embedding": doc["emb"],
                    }
                }
            }
        json.dump(document, fp)

    if iteration < 100000:
        iteration += 1
        print(iteration)
    else:
        break
