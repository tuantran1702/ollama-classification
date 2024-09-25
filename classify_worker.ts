import { Ollama } from "@langchain/ollama";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import * as fs from "fs";
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as os from 'os';
import { performance } from 'perf_hooks';
import { type Article } from "./article";
import { promptTemplate } from "./prompt";
import { processArticles } from "./utils";
type Articles = {
    articles: Article[];
};

const model = new Ollama({
    baseUrl: "http://localhost:11434",
    model: "ticlazau/meta-llama-3.1-8b-instruct",
});


const parser = new JsonOutputParser<Article>();

const numCPUs = os.cpus().length;

if (isMainThread) {
    const startTime = performance.now();
    
    const records: Article[] = JSON.parse(fs.readFileSync('records.json', 'utf-8'));
    const chunkSize = Math.ceil(records.length / numCPUs);
    const chunks = Array(numCPUs).fill(null).map((_, index) =>
        records.slice(index * chunkSize, (index + 1) * chunkSize)
    );

    const workers = new Set<Worker>();
    let processedCount = 0;
    const results: Article[] = [];
    const workerTimes: { [workerId: number]: number } = {};

    for (let i = 0; i < numCPUs; i++) {
        const worker = new Worker(__filename, {
            workerData: { chunk: chunks[i], workerId: i }
        });

        workers.add(worker);

        worker.on('message', (message) => {
            results.push(...message.results);
            processedCount += message.results.length;
            workerTimes[message.workerId] = message.time;

            if (processedCount === records.length) {
                const endTime = performance.now();
                const totalTime = (endTime - startTime) / 1000;  // Convert to seconds

                fs.writeFileSync('results.json', JSON.stringify(results, null, 4));
                console.log('All records processed and saved to results.json');
                console.log(`Total processing time: ${totalTime.toFixed(2)} seconds`);
                
                for (const [workerId, time] of Object.entries(workerTimes)) {
                    console.log(`Worker ${workerId} processing time: ${(time / 1000).toFixed(2)} seconds`);
                }

                for (const worker of workers) {
                    worker.terminate();
                }
            }
        });

        worker.on('error', (err) => {
            console.error(err);
        });

        worker.on('exit', (code) => {
            if (code !== 0)
                console.error(`Worker stopped with exit code ${code}`);
            workers.delete(worker);
        });
    }
} else {
    // This code runs in worker threads
    const { chunk, workerId } = workerData;

    const chain = promptTemplate.pipe(model).pipe(parser);

    processArticles(chain, chunk).then((results) => {
        parentPort?.postMessage({ ...results, workerId });
    }).catch((error) => {
        console.error('Error in worker:', error);
    });
}