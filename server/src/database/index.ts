import { createConnection } from "typeorm";
import { Database } from "../lib/types";
import { BookingEntity, ListingEntity, UserEntity } from "./entity";

// const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}.mongodb.net/test?retryWrites=true&w=majority`;

export const connectDatabase = async (): Promise<Database> => {
	const connection = await createConnection();
	// return map of collections in database
	return {
		bookings: connection.getRepository(BookingEntity),
		listings: connection.getRepository(ListingEntity),
		users: connection.getRepository(UserEntity)
	};
};


// ts natively provides promise interface which accepts a type variable
// connectDatabase async returns a promise that when resolved will be an obj of type Database
// listing field in obj to be returned will now be inferred as a Collection<Listing>