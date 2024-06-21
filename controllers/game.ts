import { ApiNext, ApiRequest, ApiResponse } from "../type";
import prisma from "../config/dbClient";

async function upscore(req: ApiRequest, res: ApiResponse, next: ApiNext) {
    try {
        const { points, remaining_energy, restore_time } = req.body;
        const tgUser = req.user;
        if (!tgUser || !tgUser.id) {
            return res.status(401).json({ error: "unauth" });
        }
        const teleid = tgUser.id;
        const userDbDetails = await prisma.earnings.findFirst({ where: { teleid } });
        
        const updateData = {
            tap_points: points,
            remaining_energy: remaining_energy,
            restore_time: restore_time,
            updated_at: new Date(),
        };

        /// TODO:
        /// get user earning detail (userEarning)
        /// assume user point booster is 1x, user energy booster is 1x, max energy is 10k
        /// base on userEarning.restore_time, Date.now => calculate possible_energy
        /// base on possible_energy, remaining_energy => validate, calculate possible_points
        /// base on tap_points, possible_points => validate

        if (userDbDetails) {
            const updated = await prisma.earnings.updateMany({
                where: { teleid: teleid },
                data: updateData
            });

            if (updated) {
                return res.status(200).json({
                    isUpdate: true,
                    message: "Point updated successfully",
                    restore_time: new Date(),
                });
            } else {
                return res
                    .status(401)
                    .json({ isUpdate: false, message: "Point update failed", updated });
            }
        } else {
            const initData = {
                teleid: teleid,
                tap_points: 0,
                game_played_time: 0,
                game_deducted_points: 0,
                created_at: new Date(),
            };
            const newUser = await prisma.earnings.create({ data: initData });
            if (newUser) {
                return res
                    .status(200)
                    .json({ isUpdate: true, message: "Point inserted successfully" });
            } else {
                return res
                    .status(401)
                    .json({ isUpdate: false, message: "Point insertion failed" });
            }
        }
    } catch (error) {
        console.error("Error updating points:", error);
        return res
            .status(500)
            .json({ isUpdate: false, message: "Internal server error" });
    }
}

async function getscore(req: ApiRequest, res: ApiResponse, next: ApiNext) {
    try {
        const tid = req.user.id;
        if (tid) {
            const userDbDetails = await prisma.earnings.findFirst({
                where: { teleid: tid },
            });

            if (userDbDetails) {
                const value = {
                    // checkin_points: userDbDetails.checkin_points.toString(),
                    // game_deducted_points: userDbDetails.game_deducted_points.toString(),
                    // game_played_time: userDbDetails.game_played_time.toString(),
                    // ref_points: userDbDetails.ref_points.toString(),
                    points: userDbDetails.tap_points.toString(),
                    restore_time: userDbDetails.restore_time,
                    energy: userDbDetails.remaining_energy,
                };
                res.status(200).json({ isSucceed: true, message: "success", value });
            } else {
                res.status(200).json({ isSucceed: false, message: "no data" });
            }
        } else {
            res.status(401).json({ message: "Invalid user" });
        }
    } catch (error) {
        console.error("Error retrieving data:", error);
        return res
            .status(500)
            .json({ isUpdate: false, message: "Internal server error" });
    }
}

export default {
    upscore,
    getscore,
};