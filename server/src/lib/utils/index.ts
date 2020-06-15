import { Request } from "express";
import { Database } from "../types";
import { UserEntity } from "../../database/entity";

export const authorize = async (
    db: Database, 
    req: Request
): Promise<UserEntity | null> => {
    const token = req.get("X-CSRF-TOKEN");
    const viewer = await db.users.findOne({
        id: req.signedCookies.viewer,
        token
    });

    return !viewer ? null : viewer; 
    
};


// using instance null instead of undefined
    // why?
        // the findOne() MongoDB func returns a doc obj or a null val in this way
// get X-CSRF-TOKEN from header passed in the request (calling the header key)