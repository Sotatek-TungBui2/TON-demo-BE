import jwt from "jsonwebtoken";
import { ApiNext, ApiRequest, ApiResponse } from "../type";
import { TgUser } from "@prisma/client";

function tgauth_required(req: ApiRequest, res: ApiResponse, next: ApiNext) {
    const auth_header = req.headers["authorization"];
    if (!auth_header) {
        return res.status(401).json({
            statusCode: 401,
            status: "error",
            message: "unauthorized access: Invalid or missing token",
        });
    }

    const token = auth_header.split(" ")[1];
    if (!token) {
        return res.status(401).json({
            statusCode: 401,
            status: "error",
            message: "unauthorized access: Invalid or missing token",
        });
    }

    jwt.verify(token, process.env.SECRET_KEY!, (err: any, user: any) => {
        if (err) {
            return res.status(401).json({
                statusCode: 403,
                status: "error",
                message: "unauthorized access: invalid or missing token",
            });
        }
        req.user = user;

        next();
    });
}

export default {
    tgauth_required,
};
