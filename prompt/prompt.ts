import { ChatPromptTemplate } from "@langchain/core/prompts";

export const query = (title: string, description: string) => `i have a list of category related to cryptocurrency.
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

export const formatInstructions = `Respond only in valid JSON. The JSON object you return should match the following schema:
{{ title: "string", label: "string"  }}

Where title is the provided title and label is on the list of category provided.
`;

export const promptTemplate = await ChatPromptTemplate.fromMessages([
    [
        "system",
        "Answer the user query. Wrap the output in 'json' tags\n{format_instructions}",
    ],
    ["human", "{query}"],
]).partial({
    format_instructions: formatInstructions,
});