# Benchmarking

Those scripts are used to see how the app will behave under load. Right now it is coupled with the python script `load_dataset.py` that will load a cohere dataset with embeddings already set (we might want to build our own).

to run the scripts:

`yarn tsx --env-file=.env benchmarking/ingest-flow.ts yourRunName`
