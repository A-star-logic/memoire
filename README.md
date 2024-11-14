# Memoire

Memoire is a text search/RAG solution. It handles for you all the details of making a good document retrieval so you can focus on building your app (and delight your users).

## Features

- **Perfected document retrieval**: hybrid search, structRag, Agentic chunking, Context extraction in messages, and many more done for you.
- **Easy API**: Send us texts, or send us link to downloadable documents, we handle the rest.
- **Document parsing**: forget about parsing html, xml, docx, pdfs and the gazillion document types out there, just send us a link: we download, parse and index documents for you.
- **Open source**: you can see everything we do, our company is transparent.

### License & running the app

We are not open source yet. We have our [own source-available license you can read here](./LICENSE), the TLDR is:

- Today, you can use freely the software for hobby or educational purpose, but you need to pay a fee to deploy to production (we can negotiate this fee).
- Our goal is become default alive as quickly as possible.
- Once we are, the major portion of the code will become MIT licensed (open core).
- To buy a license, [contact me on linkedin (please send a message as well) or ping me on github](https://www.linkedin.com/in/mael-abgrall/)

## Get started

### Installing the app

You will need to use docker, the easiest will be to [copy and paste our docker-compose](docker/docker-compose.yml)

### Requirements

Memoire is written using typescript and run on a single core. We tried and tested and it can load around 100k documents on 1Gb of ram when using 768 dimensions.
The docker compose has been set to limit the resources to 1 core and 1Gb of ram, so you can see how your dataset uses the container.

### Env variables

To work, the container require a few environment variables:

mandatory:

- `API_KEY`: this will be used to communicate with Memoire. Make it secure (ex: use `openssl rand -hex 32`). The API_KEY needs to be present in the requests headers:

```bash
curl http://localhost:3003/endpoint -H "Authorization: Bearer my_API_KEY"
```

optional:

- `SHOW_DOC=true`: enable the documentation endpoint and pretty-print logs.
- `EMBEDDING_MODEL`: the embedding model you want to use, leave empty to use a CPU, local model
- `AWS_SECRET_ACCESS_KEY`: if you are using bedrock ([see our tutorial here to get it](./docs/aws_bedrock.md))
- `AWS_ACCESS_KEY_ID`: if you are using bedrock ([see our tutorial here to get it](./docs/aws_bedrock.md))
- `AWS_REGION`: if you are using bedrock ([see our tutorial here to get it](./docs/aws_bedrock.md))
- `OPENAI_KEY`: if you are using OpenAI models (Azure or not)
- `OPENAI_DEPLOYMENT`: if you are using Azure open AI models (leave empty to use OpenAI's servers)

### API documentation

You can either read the documentation using the environment variable SHOW_DOC, or
[read it online here](https://memoire.apidocumentation.com/)

## Github, contributing & issues

You are welcome to contribute to the repository, just look for open issues.

## Problems?

If you are facing issues with Memoire, depending on which plan you have:

- **You are a subscriber**: you should contact our team immediately, you already have our whatsapp. I will respond as soon as possible during working hours
- **You are not a subscriber**: please open a new issue, and tag @mael-abgrall, the maintainer of the repository

### Common issues

- I get a 401 error -> make sure your environment variable in docker has no space and no quotes, make sure you are sending the right header.
- bedrock or cohere models throw an error "`undefined Message: Invalid URL`" -> make sure your environment variable in docker has no space and no quotes.
