import { Earnings, TgUser } from "@prisma/client";
import { ApiNext, ApiRequest, ApiResponse } from "../type";
import prisma from "../config/dbClient";

import jwt from "jsonwebtoken";
import _ from "lodash";
import { v4 as uuidv4 } from "uuid";

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

export default {
    auth,
};