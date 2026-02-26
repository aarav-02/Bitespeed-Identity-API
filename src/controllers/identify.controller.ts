import { Request, Response } from "express";
import { identifyService } from "../services/identify.service";

export const identifyContact = async (req: Request, res: Response) => {
  try {
    let { email, phoneNumber } = req.body;

    if (!email && !phoneNumber) {
      return res.status(400).json({ 
        error: "At least one of email or phoneNumber is required" 
      });
    }

    // Convert phoneNumber to string if provided
    if (phoneNumber !== undefined && phoneNumber !== null) {
      phoneNumber = String(phoneNumber);
    }

    const result = await identifyService(email, phoneNumber);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in identifyContact:", error);
    return res.status(500).json({ 
      error: "Internal server error" 
    });
  }
};