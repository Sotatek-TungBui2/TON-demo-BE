import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import dot_env from "dotenv";
import moment from "moment";
import apiRouter from "./routes/api/main";
import { ApiNext, ApiRequest, ApiResponse } from "./type";

dot_env.config();

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/api", apiRouter);

//404 handler
app.use(function (req, res, next) {
    return res.status(404).json({
        statusCode: 404,
        status: "error",
        message: "Not found",
    });
});

//500 handler
app.use(function (err: any, req: ApiRequest, res: ApiResponse, next: ApiNext) {
    console.log(
        "err",
        err,
        "timestamp: ",
        moment().utc().format("YYYY-MM-DD HH:mm:ss")
    );
    return res.status(err.status || 500).json({
        statusCode: 500,
        status: "error",
        message: "Internal server error",
    });
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
})
