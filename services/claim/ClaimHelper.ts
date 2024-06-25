import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, toNano } from '@ton/core';

export type ClaimHelperConfig = {
    master: Address;
    proofHash: Buffer;
    index: bigint;
};

export function claimMasterHelperConfigToCell(config: ClaimHelperConfig): Cell {
    return beginCell()
        .storeBit(false)
        .storeAddress(config.master)
        .storeBuffer(config.proofHash, 32)
        .storeUint(config.index, 256)
        .endCell();
}

export class ClaimHelper implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static hexCode = "b5ee9c7241010701008a000114ff00f4a413f4bcf2c80b01020120040201bef26c2101821005f5e100bef2e2c0ed44d0d20001f2d2be88ed54fa40d3ffd3ff3003d33fd43020f9005003baf2e2c1f800820afaf08070fb02821043c7d5c9c8cb1fcb3fcc12cbffc9718010c8cb055003cf1670fa0212cb6accc98306fb00030001c002014806050011a098d7da89a1ae14010002d0289d180d";

    static createFromAddress(address: Address) {
        return new ClaimHelper(address);
    }

    static createFromConfig(config: ClaimHelperConfig, code: Cell, workchain = 0) {
        const data = claimMasterHelperConfigToCell(config);
        const init = { code, data };
        return new ClaimHelper(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender) {
        await provider.internal(via, {
            value: toNano('0.15'),
        });
    }

    async sendClaim(provider: ContractProvider, queryId: bigint, proof: Cell) {
        await provider.external(beginCell().storeUint(queryId, 64).storeRef(proof).endCell());
    }

    async getClaimed(provider: ContractProvider): Promise<boolean> {
        if ((await provider.getState()).state.type == 'uninit') {
            return false;
        }
        const stack = (await provider.get('get_claimed', [])).stack;
        return stack.readBoolean();
    }
}
