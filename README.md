# Memoire

Memoire is a text search/RAG solution. It handles for you all the details of making a good document retrieval so you can focus on building your app (and delight your users).

## Features

- **Deploy in one day**: We made our API as intuitive as possible, so you can get a working RAG in a few minutes instead of months.
- **State of the art retrieval**: Benefit from the latest and best algorithms of retrieval such as hybrid search, agentic chunking and many more.
- **Auto document parsing**: Forget about parsing html, xml, docx, pdfs and the gazillion document types out there. Memoire already does it for you.

### License & running the app

We are not open source yet. We have our [own source-available license you can read here](./LICENSE), the TLDR is:

- Today, you can use freely the software for hobby or educational purpose, but you need to pay a fee to deploy to production (we can negotiate this fee).
- Our goal is become default alive as quickly as possible.
- Once we are, the code will become open core.
- To buy a license, [book a call on our website](https://astarlogic.com?utm_source=github&utm_medium=readme)

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
- `AWS_SECRET_ACCESS_KEY`: if you are using bedrock ([see our tutorial here to get it](./docs/tutorials/AWS/bedrock/index.md))
- `AWS_ACCESS_KEY_ID`: if you are using bedrock ([see our tutorial here to get it](./docs/tutorials/AWS/bedrock/index.md))
- `AWS_REGION`: if you are using bedrock ([see our tutorial here to here to get it](./docs/tutorials/AWS/bedrock/index.md))
- `OPENAI_KEY`: if you are using OpenAI models (Azure or not)
- `OPENAI_DEPLOYMENT`: if you are using Azure open AI models (leave empty to use OpenAI's servers)

### Tutorials

[See all our tutorials here](./docs/tutorials/index.md)

### API documentation

You can either read the documentation using the environment variable SHOW_DOC, or
[read it online here](https://memoire.apidocumentation.com/)

### Telemetry disclaimer

To improve our product, understand how it is used and any issues you might face, we collect anonymous data, which is sent to Posthog and Sentry. There is no way to disable it for now (sorry, it's on our [roadmap](https://github.com/orgs/A-star-logic/projects/3/views/1)), in the meantime you can block their domains if this is an issue for you.

## Github, contributing & issues

You are welcome to contribute to the repository, just look for open issues.

## Problems?

If you are facing issues with Memoire, depending on which plan you have:

- **You are a subscriber**: you should contact our team immediately, you already have our whatsapp. I will respond as soon as possible during working hours
- **You are not a subscriber**: please open a new issue, and tag @mael-abgrall, the maintainer of the repository

### Common issues

- I get a 401 error -> make sure your environment variable in docker has no space and no quotes, make sure you are sending the right header.
- bedrock or cohere models throw an error "`undefined Message: Invalid URL`" -> make sure your environment variable in docker has no space and no quotes.
- I get an error `Error code: undefined Message: EACCES: permission denied, mkdir '.memoire/sources'` -> This is a linux permission issue. In the cloud -> make sure the volume attached has the user node:node; In docker compose, you can add `user: 1001:1001`
