import {
    elizaLogger,
    generateText,
    ModelClass,
    type AgentRuntime as IAgentRuntime,
} from "@elizaos/core";
import type { Memory, Provider, State } from "@elizaos/core";
import { callContractViewMethod } from "../contracts/call-contract-view-method";
import { ethers } from "ethers";

interface ContractDetails {
    prizePool: string;
    currentFee: string;
    abandonedGameTimeElapsed: boolean;
    lastPlayerAddress: string;
    winnerAddress: string;
}

interface TeesaHistoryEntry {
    id: string;
    userId: string;
    timestamp: number;
    userMessage: string | undefined;
    llmMessage: string
}

async function getContractDetails(): Promise<ContractDetails> {
    const prizePool = await callContractViewMethod("prizePool");
    const currentFee = await callContractViewMethod('currentFee');
    const abandonedGameTimeElapsed = await callContractViewMethod('abandonedGameTimeElapsed');
    const lastPlayerAddress = await callContractViewMethod('lastPlayerAddress');
    const winnerAddress = await callContractViewMethod('winnerAddress');

    const prizePoolFormatted = Number(ethers.formatEther(prizePool)).toFixed(5);
    const currentFeeFormatted = Number(ethers.formatEther(currentFee)).toFixed(5);

    return {
        prizePool: prizePoolFormatted,
        currentFee: currentFeeFormatted,
        abandonedGameTimeElapsed: abandonedGameTimeElapsed,
        lastPlayerAddress: lastPlayerAddress,
        winnerAddress: winnerAddress,
    };
}

async function getTeesaHistory(): Promise<TeesaHistoryEntry[]> {
    const teesaUrl = process.env.TEESA_URL;
    let messages: TeesaHistoryEntry[] = [];

    try {
        const response = await fetch(`${teesaUrl}/api/get-messages?includeSystemMessages=false`);
        messages = await response.json();
    } catch (error) {
        elizaLogger.error('Failed to fetch Teesa messages:', error);
    }

    return messages;
}

async function summarizeTeesaHistory(
    runtime: IAgentRuntime,
    history: TeesaHistoryEntry[]
): Promise<string> {
    const messages = history.map(msg => `${new Date(msg.timestamp).toLocaleString()}\n` +
        `${msg.userMessage ? `User ${msg.userId}: ${msg.userMessage}\n` : ''}` +
        `Teesa: ${msg.llmMessage}`
    ).join('\n\n');

    const context = `
# Task: Summarize the given conversation between users and a word guessing game host Teesa.
The conversation is:
${messages}

# Instructions:
The users either ask yes/no questions about the secret word or they try to guess it.
Summarize all the details that the users found about the secret word.
Just generate the summary, do not include any other clarification or explanation.`;

    const response = await generateText({
        runtime,
        context,
        modelClass: ModelClass.MEDIUM,
    });

    return response;
}

const gameProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const contractDetails = await getContractDetails();
        const history = await getTeesaHistory();
        const summary = await summarizeTeesaHistory(runtime, history);

        const EMPTY_ADDRESS = "0x0000000000000000000000000000000000000000";

        let result = "-------TEESA GAME PROVIDER-------\n";
        result += "# Game Details\n";
        if (contractDetails.abandonedGameTimeElapsed) {
            result += `
Status: Abandoned due to inactivity
Prize Pool: ${contractDetails.prizePool} ETH
Last Player: ${contractDetails.lastPlayerAddress}`;
        } else if (contractDetails.winnerAddress !== EMPTY_ADDRESS) {
            result += `
Status: Ended
Winner: ${contractDetails.winnerAddress}
Prize Pool: ${contractDetails.prizePool} ETH`;
        } else {
            result += `
Status: Active
Prize Pool: ${contractDetails.prizePool} ETH
Current Fee: ${contractDetails.currentFee} ETH

# Conversation Summary
${summary}`;
        }
        result += "\n-------END OF TEESA GAME PROVIDER-------";

        return result;
    },
};

export { gameProvider };
