import express from "express";
import cookieParser from "cookie-parser";
import logger from "morgan";
import dot_env from "dotenv";
import moment from "moment";
import cors from "cors";
import apiRouter from "./routes/api/main";
import { ApiNext, ApiRequest, ApiResponse } from "./type";
dot_env.config();

const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(cors())
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
        errorMessage: err.message,
        message: "Internal server error",
    });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log("Server is running on port:", PORT);
})
