import express from "express";
import cors from "cors";
import identifyRoute from "./routes/identify.route";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/identify", identifyRoute);

export default app;
