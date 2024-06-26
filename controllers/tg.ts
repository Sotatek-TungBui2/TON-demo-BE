import { Earnings, TgUser } from "@prisma/client";
import { ApiNext, ApiRequest, ApiResponse } from "../type";
import prisma from "../config/dbClient";

import jwt from "jsonwebtoken";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";
import { deployContract, getBalance, getJettonAddress, mintAction, openWallet, transferAction, waitForStateChange } from "../services/ton";
import { ClaimMaster, ClaimMasterEntry, generateEntriesDictionary } from "../services/claim/ClaimMaster";
import { Address, Cell, Dictionary, beginCell, toNano } from "@ton/core";
import { ClaimHelper } from "../services/claim/ClaimHelper";

// function isMobileDevice(userAgent: string) {
//     return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
//         userAgent
//     );
// }

async function auth(req: ApiRequest, res: ApiResponse, next: ApiNext) {
    // var user_agent = req.headers["user-agent"];
    // var is_mobile = isMobileDevice(user_agent);

    // if (user_agent === undefined || is_mobile !== true) {
    //     return res.status(403).json({
    //         statusCode: 403,
    //         status: "error",
    //         message: "Only available for mobile devices",
    //     });
    // }

    try {
        let {
            id = null,
            username = "",
            first_name = "",
            last_name = "",
            language_code = "",
            referral_by = "",
            is_premium,
        } = req.body;

        if (!_.isNil(id)) {
            let tg_user = await prisma.tgUser.findFirst({
                where: {
                    userid: id,
                },
            });

            let sync_data: Partial<TgUser & Earnings> = {};

            if (tg_user === null) {
                let referral_code = uuidv4().replace(/-/g, "");
                let tg_user_data: Partial<TgUser> = {
                    userid: id,
                    username: username,
                    first_name: first_name,
                    last_name: last_name,
                    language_code: language_code,
                    referral_by: referral_by,
                    referral_code: referral_code,
                };

                if (is_premium === true) {
                    tg_user_data["tg_premium_user"] = "Y";
                }
                let create_tg_user = await prisma.tgUser.create({ data: tg_user_data as TgUser });
                if (!create_tg_user) {
                    throw new Error(
                        `TGUser insert failed in /api/tg/auth ${JSON.stringify(
                            tg_user_data
                        )}`
                    );
                } else {
                    const initData = { teleid: id };
                    const newUser = await prisma.earnings.create({ data: initData });
                    if (!newUser) {
                        throw new Error(
                            `TGUser insert failed in /api/tg/auth ${JSON.stringify(
                                tg_user_data
                            )}`
                        );
                    }
                }

                sync_data = {
                    referral_code: referral_code,
                    miner_level: 0,
                    last_mine_date: new Date(),
                    tap_points: 0n,
                };
            } else {
                let earnings = (await prisma.earnings.findFirst({
                    where: {
                        teleid: tg_user.userid,
                    },
                }))!;
                sync_data = {
                    referral_code: tg_user.referral_code,
                    miner_level: earnings.miner_level === null ? 0 : earnings.miner_level,
                    last_mine_date: earnings.last_mine_date || sync_data.last_mine_date,
                    tap_points: earnings.tap_points,
                };
            }

            let token = jwt.sign(
                {
                    id: id,
                    username: username,
                    referral_code: sync_data["referral_code"],
                },
                process.env.SECRET_KEY!
            );
            // @ts-ignore
            sync_data["auth_token"] = token;

            return res.status(200).json({
                statusCode: 200,
                status: "success",
                sync_data: {
                    ...sync_data,
                    tap_points: sync_data.tap_points?.toString() || "0"
                },
                message: "Successfully authenticated",
            });
        }

        return res.status(400).json({
            statusCode: 400,
            status: "error",
            message: "Invalid Data",
        });
    } catch (err) {
        next(err);
    }
}

async function claim(req: ApiRequest, res: ApiResponse, next: ApiNext) {
    try {
        const toAddress = req.body.to;
        if (!toAddress) throw ("Invalid address");
        const earnings = await prisma.earnings.findFirst({
            where: {
                teleid: req.user.id,
            }
        })
        if (!earnings || earnings!.tap_points.toString() === '0') throw ("Not enough point");
        console.log('earnings', earnings!.tap_points.toString());
        const wallet = await openWallet(process.env.MNEMONIC!.split(" "), Number(process.env.TESTNET) === 1);
        const transferAmount = earnings.tap_points;
        const seqno = await transferAction(wallet, toAddress, transferAmount);
        const jWallet = await getJettonAddress(wallet, toAddress);
        console.log('jWallet', jWallet.toString());
        await waitForStateChange(
            async () => getBalance(wallet, jWallet)
        );
        console.log('seqno', seqno);
        await prisma.earnings.updateMany({
            where: {
                teleid: req.user.id
            },
            data: {
                tap_points: BigInt(0)
            }
        })
        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Successfully claimed",
        });
    } catch (err) {
        next(err);
    }
}

async function request_claim(req: ApiRequest, res: ApiResponse, next: ApiNext) {
    try {
        const { amount, to } = req.body;
        console.log(to);
        
        const earnings = await prisma.earnings.findFirst({
            where: {
                teleid: req.user.id,
            }
        });
        if (!earnings) throw ("Not found earning");
        if (BigInt(earnings.tap_points) < BigInt(amount)) throw ("Not enough point");
        const transferAmount = toNano(amount) / 10000n; // 1 point = 0.001 jetton

        const wallet = await openWallet(process.env.MNEMONIC!.split(" "), Number(process.env.TESTNET) === 1);
        const merkle = createMerkleTree([{
            address: Address.parse(to),
            amount: transferAmount,
        }]);

        const claimMaster = ClaimMaster.createFromConfig(
            {
                merkleRoot: merkle.merkleRoot,
                helperCode: Cell.fromBoc(Buffer.from(ClaimHelper.hexCode, 'hex'))[0],
            },
            Cell.fromBoc(Buffer.from(ClaimMaster.hexCode, 'hex'))[0]
        )
        console.log('claimMaster', claimMaster.address.toString());
        const claimMasterJettonWallet = await getJettonAddress(wallet, claimMaster.address);
        console.log('claimMasterJettonWallet', claimMasterJettonWallet.toString());

        //////// fund to ClaimMaster Jetton Wallet
        console.log("Funding ClaimMaster Jetton Wallet ...");
        await mintAction(wallet, claimMaster.address, amount);
        await waitForStateChange(
            // async () => await wallet.contract.getSeqno(),
            async () => getBalance(wallet, claimMasterJettonWallet),
            40,
        )
        console.log('funded to ClaimMaster');
        ////////

        /////
        console.log("Deploying ClaimMaster ...")
        await deployContract(
            claimMaster,
            beginCell().storeUint(0x610ca46c, 32).storeUint(0, 64).storeAddress(claimMasterJettonWallet).endCell(),
            wallet,
        );
        await waitForStateChange(
            async () => wallet.contract.getSeqno()
        );
        console.log('Deployed ClaimMaster');
        /////

        await prisma.earnings.update({
            where: { id: earnings.id },
            data: { tap_points: BigInt(earnings.tap_points) - BigInt(amount) }
        });
        await prisma.request.create({
            data: {
                amount: amount,
                merkleProof: merkle.proofs[0].toBoc().toString('hex'),
                teleid: earnings.teleid,
                claimMaster: claimMaster.address.toString(),
                isClaimed: 0,
            }
        })
        
        return res.status(200).json({
            statusCode: 200,
            status: "success",
            message: "Successfully requested claim",
        });
    } catch (error) {
        next(error);   
    }
}

const createMerkleTree = (_entries: ClaimMasterEntry[]) => {
    // there must be at least odds entries
    const entries: ClaimMasterEntry[] = _entries.concat([
        {
            address: Address.parse('0QCmx_TA6aYafVsuXn6zB7q0R9Plp9NccKqWSYxbCnI6zC6G'),
            amount: toNano(getRandomInt(1, 99). toString()),
        },
        {
            address: Address.parse('0QCvI7UEQXDoehtYlWa_aJp9ijj6Mj9iTO5e736-Fxv-cUmr'),
            amount: toNano(getRandomInt(1, 99). toString()),
        },
    ]);
    console.log(entries);
    const dict = generateEntriesDictionary(entries);
    const dictCell = beginCell().storeDictDirect(dict).endCell();
    console.log(`Dictionary cell (store it somewhere on your backend: ${dictCell.toBoc().toString('base64')}`);
    const merkleRoot = BigInt('0x' + dictCell.hash().toString('hex'));
    console.log(`merkleRoot: ${merkleRoot}`);
    
    const proofs = entries.map((_, index) => {
        return dict.generateMerkleProof(BigInt(index))
    })

    return {merkleRoot, dict, dictCell, proofs};
}

async function get_request_claim(req: ApiRequest, res: ApiResponse, next: ApiNext) {
    let data = await prisma.request.findMany({
        where: {
            teleid: req.user.id,
            isClaimed: 0
        },
        orderBy: {
            id: 'desc',
        }
    })
    // @ts-ignore
    data = data.map((item) => ({
        ...item,
        amount: item.amount.toString(),
        teleid: undefined,
    }))
    return res.status(200).json({
        statusCode: 200,
        status: "success",
        data: data,
    });
}

async function claimed(req: ApiRequest, res: ApiResponse, next: ApiNext) {    
    if (isNaN(req.params.id)) {
        return next(Error("Invalid id"));
    }
    await prisma.request.updateMany({
        where: {
            teleid: req.user.id,
            isClaimed: 0,
            id: parseInt(req.params.id)
        },
        data: {
            isClaimed: 1
        }
    })
    return res.status(200).json({
        statusCode: 200,
        status: "success",
    });
}

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default {
    auth,
    claim,
    request_claim,
    get_request_claim,
    claimed
};