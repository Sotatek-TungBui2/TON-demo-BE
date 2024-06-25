import {
    Dictionary,
    Address,
    beginCell,
    Cell,
    Contract,
    contractAddress,
    ContractProvider,
    Sender,
    SendMode,
    Builder,
    Slice,
} from '@ton/core';

export type ClaimMasterConfig = {
    merkleRoot: bigint;
    helperCode: Cell;
};

export function claimMasterConfigToCell(config: ClaimMasterConfig): Cell {
    return beginCell()
        .storeUint(0, 2)
        .storeUint(config.merkleRoot, 256)
        .storeRef(config.helperCode)
        .storeUint(Math.floor(Math.random() * 1e9), 64)
        .endCell();
}

export type ClaimMasterEntry = {
    address: Address;
    amount: bigint;
};

export const claimMasterEntryValue = {
    serialize: (src: ClaimMasterEntry, buidler: Builder) => {
        buidler.storeAddress(src.address).storeCoins(src.amount);
    },
    parse: (src: Slice) => {
        return {
            address: src.loadAddress(),
            amount: src.loadCoins(),
        };
    },
};

export function generateEntriesDictionary(entries: ClaimMasterEntry[]): Dictionary<bigint, ClaimMasterEntry> {
    let dict: Dictionary<bigint, ClaimMasterEntry> = Dictionary.empty(Dictionary.Keys.BigUint(256), claimMasterEntryValue);

    for (let i = 0; i < entries.length; i++) {
        dict.set(BigInt(i), entries[i]);
    }

    return dict;
}

export class ClaimMaster implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static hexCode = "b5ee9c7241020b01000151000114ff00f4a413f4bcf2c80b0102016203020033a0df8dda89a1f48003f0c3a7fe03f0c5a861f0c7f083f085f0870202cd0704020148060500771c083e11a08403e29fa97232c7f2cfd400fe8088f3c59400f3c5b2c020822625a03e80b2c0325c60063232c17e1073c59c3e80b2dab33260103ec02000173e4020c27232c2b2fff274200201200908002f570c8cb00f828cf1612cbffcbffc9f84376c8cb04ccccc9801b546c2220d749c160915be0d31f01f864d33f01f86601d074d721fa4030f865ed44d0fa4001f861d3ff01f862d430f863f8448210610ca46cba8e1ef841d70b01c000f2e2c2fa4030f861f843f842c8f841cf16cbffccc9ed54e30e80a009cf844821043c7d5c9ba8e3cd4d3ff3021d739f2aad30701c003f2abf84201d3ff59baf2acd43052108307f40e6fa1f2adf84503f90058f003f00412c705f2e2bffa40fa0030f0059530840ff2f0e254438534";

    static createFromAddress(address: Address) {
        return new ClaimMaster(address);
    }

    static createFromConfig(config: ClaimMasterConfig, code: Cell, workchain = 0) {
        const data = claimMasterConfigToCell(config);
        const init = { code, data };
        return new ClaimMaster(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint, jettonWallet: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(0x610ca46c, 32).storeUint(0, 64).storeAddress(jettonWallet).endCell(),
        });
    }
}
