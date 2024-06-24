import { mnemonicToPrivateKey, KeyPair } from "@ton/crypto"
import { Address, OpenedContract, SendMode, TonClient, WalletContractV4, beginCell, internal, toNano } from "@ton/ton";
import { JettonWallet } from "./jetton/jettonWallet";

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
    const nanoTransfer = toNano(toAmount);

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
