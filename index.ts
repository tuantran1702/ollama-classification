import { Ollama } from "@langchain/ollama";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import * as fs from "fs";
import { Worker, isMainThread, parentPort, workerData } from 'worker_threads';
import * as os from 'os';
import { performance } from 'perf_hooks';

type Article = {
    title: string;
    description: string;
    label: string;
};

type Articles = {
    articles: Article[];
};

const model = new Ollama({
    baseUrl: "http://localhost:11434",
    model: "ticlazau/meta-llama-3.1-8b-instruct",
});

const query = (title: string, description: string) => `i have a list of category related to cryptocurrency.
Market Update
Technology & Innovation
Regulatory & Legal
Business & Adoption
Security & Privacy
Politics & Governance
DeFi & NFTs
Investment & Trading
Blockchain Applications
Industry Infrastructure

please label the article in one of these labels
${title} \n ${description}
`;

const formatInstructions = `Respond only in valid JSON. The JSON object you return should match the following schema:
{{ title: "string", label: "string"  }}

Where title is the provided title and label is on the list of category provided.
`;

const parser = new JsonOutputParser<Article>();

const prompt = await ChatPromptTemplate.fromMessages([
    [
        "system",
        "Answer the user query. Wrap the output in 'json' tags\n{format_instructions}",
    ],
    ["human", "{query}"],
]).partial({
    format_instructions: formatInstructions,
});

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
    
    const model = new Ollama({
        baseUrl: "http://localhost:11434",
        model: "ticlazau/meta-llama-3.1-8b-instruct",
    });

    const chain = prompt.pipe(model).pipe(parser);

    const processChunk = async (chunk: Article[]) => {
        const startTime = performance.now();
        const results = [];
        for (let record of chunk) {
            const answer = await chain.invoke({ query: query(record.title, record.description) });
            console.log(answer);
            record.label = answer.label;
            results.push(record);
        }
        const endTime = performance.now();
        return { results, time: endTime - startTime };
    };

    processChunk(chunk).then((results) => {
        parentPort?.postMessage({ ...results, workerId });
    }).catch((error) => {
        console.error('Error in worker:', error);
    });
}