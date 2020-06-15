import crypto from "crypto";
import { IResolvers } from 'apollo-server-express';
import { Database, Listing, User, ListingType } from "../../../lib/types";
import { 
    ListingArgs, 
    ListingBookingsArgs, 
    ListingBookingsData,
    ListingsArgs,
    ListingsData,
    ListingsFilter,
    ListingsQuery,
    HostListingArgs,
    HostListingInput,
    Order
} from "./types";
import { Request } from "express";
import { authorize } from "../../../lib/utils";
import { Cloudinary, Google } from "../../../lib/api";

const verifyHostListingInput = ({
    title,
    description,
    type,
    price
}: HostListingInput) => {
    const { Apartment, House } = ListingType;
    if (title.length > 100) {
        throw new Error("listing title must be under 100 characters");
    }
    if (description.length > 5000) {
        throw new Error("listing description must be under 5000 characters")
    }
    if (type !== Apartment && type !== House) {
        throw new Error("listing type must be either an apartment or house");
    }
    if (price <= 0) {
        throw new Error("price must be greater than 0");
    }
};


// host field w/in listing doc obj -> id of user who owns the listing
export const listingResolvers: IResolvers = {
    Query: {
        listing: async (
            _root: undefined,
            { id }: ListingArgs,
            { db, req }: { db: Database; req: Request }
        ): Promise<Listing> => {
            try {
                const listing = (await db.listings.findOne({ id })) as Listing;
                if (!listing) {
                    throw new Error("listing cannot be found");
                }

                const viewer = await authorize(db, req);
                if (viewer && viewer.id === listing.host) {
                    listing.authorized = true;
                }

                return listing;
            } catch (error) {
                throw new Error(`failed to query listing: ${error}`);
            }
        },
        listings: async (
            _root: undefined,
            { location, filter, limit, page }: ListingsArgs,
            { db }: { db: Database }
        ): Promise<ListingsData> => {
            try {
                const query: ListingsQuery = {};
                const data: ListingsData = {
                    region: null,
                    total: 0,
                    result: []
                };

                if (location) {
                    const { country, admin, city } = await Google.geocode(location);
                    if (city) query.city = city;
                    if (admin) query.admin = admin;
                    if (country) {
                        query.country = country;
                    } else {
                        throw new Error("no country found");
                    }

                    const cityText = city ? `${city}, ` : "";
                    const adminText = admin ? `${admin}, ` : "";
                    data.region = `${cityText}${adminText}${country}`; 
                }

                let order: Order | null = null;

                if (filter && filter === ListingsFilter.PRICE_LOW_TO_HIGH) {
                    order = { price: "ASC" || 1 };
                }

                if (filter && filter === ListingsFilter.PRICE_HIGH_TO_LOW) {
                    order = { price: "DESC" || -1 };
                }

                const count = await db.listings.count(query);
                const listings = await db.listings.find({
                    where: { ...query },
                    order: { ...order },
                    skip: page > 0 ? (page - 1) * limit : 0,
                    take: limit
                });

                data.total = count;
                data.result = listings;

                return data;
            } catch (error) {
                throw new Error(`failed to query listings: ${error}`);
            }
        }
    },
    Mutation: {
        hostListing: async (
            _root: undefined,
            { input }: HostListingArgs,
            { db, req }: { db: Database; req: Request }
        ): Promise<Listing> => {
            verifyHostListingInput(input);

            const viewer = await authorize(db, req);
            if (!viewer) {
                throw new Error("viewer cannot be found");
            }

            const { country, admin, city } = await Google.geocode(input.address);
            if (!country || !admin || !city) {
                throw new Error("invalid address input");
            }

            const imageURL = await Cloudinary.upload(input.image);

            const newListing: Listing = {
                id: crypto.randomBytes(16).toString("hex"),
                ...input,
                image: imageURL,
                bookings: [],
                bookingsIndex: {},
                country,
                admin,
                city,
                host: viewer.id
            };

            const insertedListing = await db.listings.create(newListing).save();

            viewer.listings.push(insertedListing.id);
            await viewer.save();

            return insertedListing
        }
    },
    Listing: {
        host: async (
            listing: Listing,
            _args: {},
            { db }: { db: Database }
        ): Promise<User> => {
            const host = await db.users.findOne({ id: listing.host });
            if (!host) {
                throw new Error("host cannot be found");
            }
            return host;
        },
        bookingsIndex: (listing: Listing): string => {
            return JSON.stringify(listing.bookingsIndex);
        },
        bookings: async (
            listing: Listing,
            { limit, page }: ListingBookingsArgs,
            { db }: { db: Database }
        ): Promise<ListingBookingsData | null> => {
            try {
                if (!listing.authorized) {
                    return null;
                }

                const data: ListingBookingsData = {
                    total: 0,
                    result: []
                };

                const bookings = await db.bookings.findByIds(listing.bookings, {
                    skip: page > 0 ? (page-1) * limit : 0,
                    take: limit
                });

                data.total = listing.bookings.length;
                data.result = bookings;

                return data;

            } catch (error) {
                throw new Error(`failed to query listing bookings: ${error}`);
            }
        }
    }
};

/*
 As a reminder, the id field for the user document in the 
 Mongo database is of type string and not of type ObjectID. 
 MongoDB natively creates an ObjectID type for the id fields 
 but the user's id field is a string since it simply captures 
 whatever id Google OAuth returns. The host in a listing document 
 is the same string representation of this ID.
*/

/*
Listing booking resolver explained
    - root obj passed in is listing of type Listing
    - shape of arguments passed in is ListingBookingsArgs
    - upon resolving function successfully it should return a
        Promise that when resolved will be an obj of shape
        ListingBookingsData or null
    - in the resolver func, check for authorized field from listing obj
    - $in operator used within MongoDB find() method references
        the listing.bookings array
    

*/