import { Ollama } from "@langchain/ollama";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import * as fs from "fs";
import { performance } from "perf_hooks";
import { promptTemplate } from "./prompt";
import { processArticle } from "./utils";
import type { Article } from "./article";

const model = new Ollama({
  baseUrl: "http://localhost:11434",
  model: "ticlazau/meta-llama-3.1-8b-instruct",
});
const parser = new JsonOutputParser<Article>();

const inputArticle = {
  title: "3 reasons why Sui price has gone parabolic",
  description:
    "Sui, a popular layer 1 network, has become one of the best-performing cryptocurrencies since August, soaring to a five-month high. Sui token has risen for three consecutive weeks and is up by over 240% from its lowest level in August, giving it a market cap of over $4.17 billion.",
};

const chain = promptTemplate.pipe(model).pipe(parser);

const { outputArticle, time } = await processArticle(chain, inputArticle);

console.log(`title: ${outputArticle.title}`);
console.log(`description: ${outputArticle.description}`);
console.log(`label: ${outputArticle.label}`);

console.log(`time elapsed: ${time}s`);
