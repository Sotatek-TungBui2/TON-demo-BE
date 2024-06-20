import { NextFunction, Request, Response } from "express"
import { TgUser } from "@prisma/client";
export type ApiRequest = TGUser & Request<{}, any, any, QueryString.ParsedQs, Record<string, any>>;
export type ApiResponse = Response<any, Record<string, any>, number>
export type ApiNext = NextFunction