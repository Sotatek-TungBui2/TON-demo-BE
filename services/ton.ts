import { mnemonicToPrivateKey, KeyPair } from "@ton/crypto"
import { Address, Cell, Contract, OpenedContract, SendMode, TonClient, WalletContractV4, beginCell, contractAddress, internal, toNano } from "@ton/ton";
import { JettonWallet } from "./jetton/JettonWallet";
import { JettonMinter } from "./jetton/JettonMinter";

export type OpenedWallet = {
    contract: OpenedContract<WalletContractV4>;
    keyPair: KeyPair;
    wallet: WalletContractV4;
    client: TonClient;
};

export async function openWallet(mnemonic: string[], testnet: boolean): Promise<OpenedWallet> {
    const keyPair = await mnemonicToPrivateKey(mnemonic);

    const toncenterBaseEndpoint: string = testnet
        ? "https://testnet.toncenter.com"
        : "https://toncenter.com";

    const client = new TonClient({
        endpoint: `${toncenterBaseEndpoint}/api/v2/jsonRPC`,
        apiKey: process.env.TONCENTER_API_KEY,
    });

    const wallet = WalletContractV4.create({
        workchain: 0,
        publicKey: keyPair.publicKey,
    });

    let contract = client.open(wallet);
    return { wallet, contract, keyPair, client };
}

export const transferAction = async (sender: OpenedWallet, to: string | Address, toAmount: number | string | bigint) => {
    const minterAddress = Address.parse(process.env.JETTON_MINTER_ADDRESS!);
    const toAddress: Address = typeof to === 'string' ? Address.parse(to) : to;
    const nanoTransfer = toNano(toAmount) / 10000n; // 1 point = 0.001 jetton
    console.log('nanoTransfer', nanoTransfer)
    const response = await sender.client.runMethod(
        minterAddress,
        'get_wallet_address',
        [{ type: 'slice', cell: beginCell().storeAddress(sender.wallet.address).endCell() }]
    );
    const senderJWalletAddress = response.stack.readAddress();

    const seqno = await sender.contract.getSeqno();
    await sender.contract.sendTransfer({
        seqno,
        secretKey: sender.keyPair.secretKey,
        messages: [
            internal({
                value: "0.1",
                to: senderJWalletAddress,
                body: JettonWallet.transferMessage(
                        nanoTransfer,
                        toAddress,
                        sender.wallet.address!,
                        null,
                        toNano('0.05'),
                        null
                ),
            }),
        ],
        sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
    });

    return seqno;
}

export const mintAction = async (sender: OpenedWallet, to: string | Address, toAmount: number | string | bigint) => {
    const jettonMinter = Address.parse(process.env.JETTON_MINTER_ADDRESS!);
    const toAddress: Address = typeof to === 'string' ? Address.parse(to) : to;
    const nanoTransfer = toNano(toAmount) / 10000n; // 1 point = 0.001 jetton

    const seqno = await sender.contract.getSeqno();
    await sender.contract.sendTransfer({
        seqno,
        secretKey: sender.keyPair.secretKey,
        messages: [
            internal({
                value: "0.5",
                to: jettonMinter,
                body: JettonMinter.mintMessage(
                    sender.wallet.address,
                    toAddress,
                    nanoTransfer,
                    toNano('0.05'),
                    toNano('1.015'),
                ),
            }),
        ],
        sendMode: SendMode.IGNORE_ERRORS + SendMode.PAY_GAS_SEPARATELY,
    });

    return seqno;
}

export const sleep = async (ms: number) =>{ 
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const getJettonAddress = async (openedWallet: OpenedWallet, address: Address | string) => {
    const minterAddress = Address.parse(process.env.JETTON_MINTER_ADDRESS!);
    const owner = typeof address === 'string' ? Address.parse(address) : address;
    const response = await openedWallet.client.runMethod(
        minterAddress,
        'get_wallet_address',
        [{
            type: 'slice',
            cell: beginCell().storeAddress(owner).endCell()
        }]
    );
    return response.stack.readAddress();
}

export const getBalance = async (sender: OpenedWallet, jWallet: Address) => {
    try {
        const isDeployed = await sender.client.isContractDeployed(jWallet);
        if (!isDeployed)
            return 0;
    
        console.log('isDeployed', isDeployed);
    
        const response = await sender.client.runMethod(
            jWallet,
            'get_wallet_data',
            []
        );
        const balance = response.stack.readBigNumber();
    
        return balance;
    } catch (error) {
        console.log('make request failed');
        return 0;
    }
}

export const waitForStateChange = async <T>(cb: () => Promise<T>, maxRetries = 20): Promise<T> => {
    console.info('Waiting for state change...');

    const stateBefore = await cb();
    let stateAfter = stateBefore;
    let attempt = 1;
    while (stateAfter === stateBefore) {
        if (attempt > maxRetries) {
            console.info('Max retries exceeded');
            throw "Failed to transfer"
        }
        console.info(`Attempt ${attempt}\n`);
        await sleep(2000);
        try {
            stateAfter = await cb();
        } catch (_) {
            // ignore error
        }
        attempt++;
    }

    return stateAfter;
}


interface ContractDeployDetails {
    deployer: Address;
    value: bigint;
    code: Cell;
    data: Cell;
    message?: Cell;
    dryRun?: boolean;
}

export function addressForContract(params: ContractDeployDetails) {
    return contractAddress(
        0,
        {
            code: params.code,
            data: params.data,
        }
    );
}
export async function deployContract(
    contract: Contract,
    body: Cell,
    openedWallet: OpenedWallet,
): Promise<number> {
    const seqno = await openedWallet.contract.getSeqno();
    await openedWallet.contract.sendTransfer({
      seqno,
      secretKey: openedWallet.keyPair.secretKey,
      messages: [
        internal({
          value: toNano("0.05"),
          to: contract.address,
          init: contract.init,
          body: body,
        }),
      ],
      sendMode: SendMode.PAY_GAS_SEPARATELY,
    });

    return seqno;
}