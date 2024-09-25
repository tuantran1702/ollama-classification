import { Ollama } from "@langchain/ollama";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import * as fs from "fs";
import { performance } from 'perf_hooks';
import { promptTemplate } from "./prompt";
import { processArticles } from "./utils";
import type { Article } from "./article";

const model = new Ollama({
    baseUrl: "http://localhost:11434",
    model: "ticlazau/meta-llama-3.1-8b-instruct",
});
const parser = new JsonOutputParser<Article>();


    const startTime = performance.now();
    
    const records: Article[] = JSON.parse(fs.readFileSync('records.json', 'utf-8'));

    const workerTimes: { [workerId: number]: number } = {};


    const chain = promptTemplate.pipe(model).pipe(parser);

    const {results, time}= await processArticles(chain, records);
    
    fs.writeFileSync("./results.json", JSON.stringify(results, null, 4));
    console.log(`time elapsed: ${time}s`);