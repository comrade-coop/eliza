import { ethers } from "ethers";
import GameContract from './abi/Game.json';

export async function callContractViewMethod(contractMethod: string): Promise<any> {
    const rpcUrl = process.env.TEESA_RPC_URL;
    const gameContractAddress = process.env.TEESA_CONTRACT_ADDRESS;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(gameContractAddress!, GameContract.abi, provider);

    return contract[contractMethod]();
}