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
    const nanoTransfer = BigInt(toAmount);

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
