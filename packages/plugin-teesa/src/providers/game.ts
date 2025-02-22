import {
    embed,
    MemoryManager,
    formatMessages,
    type AgentRuntime as IAgentRuntime,
} from "@elizaos/core";
import type { Memory, Provider, State } from "@elizaos/core";

const gameProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        return "-------TEESA GAME PROVIDER-------";
    },
};

export { gameProvider };
