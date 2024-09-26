import type { Article } from "../models/article";
import {Runnable} from "@langchain/core/runnables"
import { query } from "../prompt/prompt";
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

export const processArticle = async (chain: Runnable, article: Article) => {
    const startTime = performance.now();
    let answer: Article = article;
    while (!answer.label){
        answer = await chain.invoke({query: query(article.title, article.description)});
    }
    article.label = answer.label;
    const outputArticle = {
        ...article,
        label: answer.label
    }
    const endTime = performance.now();
    return { outputArticle, time: (endTime - startTime)/1000 };
}