import type { Article } from "./article";
import {Runnable} from "@langchain/core/runnables"
import { query } from "./prompt";
export const processArticles = async (chain: Runnable, articles: Article[]) => {
    const startTime = performance.now();
    const results = [];
    for (let record of articles) {
        const answer = await chain.invoke({ query: query(record.title, record.description) });
        console.log(answer);
        record.label = answer.label;
        results.push(record);
    }
    const endTime = performance.now();
    return { results, time: endTime - startTime };
};