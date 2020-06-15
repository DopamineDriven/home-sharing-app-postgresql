import crypto from "crypto";
import { IResolvers } from "apollo-server-express";
import { Request } from "express";
import { Booking, BookingsIndex, Database } from "../../../lib/types";
import { authorize } from "../../../lib/utils";
import { CreateBookingArgs } from './types';
import { Stripe } from "../../../lib/api";

export const resolveBookingsIndex = (
    bookingsIndex: BookingsIndex,
    checkInDate: string,
    checkOutDate: string
): BookingsIndex => {
    let dateCursor = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const newBookingsIndex: BookingsIndex = { ...bookingsIndex };

    while (dateCursor <= checkOut) {
        const y = dateCursor.getUTCFullYear(); // 2020 (UTC-5)
        const m = dateCursor.getUTCMonth(); // 04 -> May
        const d = dateCursor.getUTCDate(); // 30

        if (!newBookingsIndex[y]) {
            newBookingsIndex[y] = {};
        }

        if (!newBookingsIndex[y][m]) {
            newBookingsIndex[y][m] = {};
        }

        if (!newBookingsIndex[y][m][d]) {
            newBookingsIndex[y][m][d] = true;
        } else {
            throw new Error("selected dates cannot overlap dates already booked");
        }

        dateCursor = new Date(dateCursor.getTime() + 86400000);
    }

    return newBookingsIndex;
};

export const bookingResolvers: IResolvers = {
    Mutation: {
        createBooking: async (
            _root: undefined,
            { input }: CreateBookingArgs,
            { db, req }: { db: Database; req: Request }
        ): Promise<Booking> => {
            try {
                const { id, source, checkIn, checkOut } = input;

                const viewer = await authorize(db, req);
                
                if (!viewer) {
                    throw new Error("viewer cannot be found");
                }

                const listing = await db.listings.findOne({ id });

                if (!listing) {
                    throw new Error("listing cannot be found");
                }

                if (listing.host === viewer.id) {
                    throw new Error("viewer cannot book their own listing");
                }

                const today = new Date();
                const checkInDate = new Date(checkIn);
                const checkOutDate = new Date(checkOut);

                // checkin date cannot exceed one year from the current date
                if (checkInDate.getTime() > today.getTime() + 365 * 86400000) {
                    throw new Error(
                        "check in date cannot exceed year-to-date"
                    );
                }

                // assume average booking is 7 days, make checkout 372 days
                if (checkOutDate.getTime() > today.getTime() + 372 * 86400000) {
                    throw new Error(
                        "check out date cannot exceed year-to-date plus one week"
                    );
                }

                if (checkOutDate < checkInDate) {
                    throw new Error(
                        "check out date cannot be before check in date"
                    );
                }

                // create new bookingsIndex as a func of checkIn and checkOut dates
                const bookingsIndex = resolveBookingsIndex(
                    listing.bookingsIndex,
                    checkIn,
                    checkOut
                );

                const totalPrice = 
                    listing.price*(
                        ((checkOutDate.getTime() - checkInDate.getTime()) / 86400000 + 1)
                    );

                const host = await db.users.findOne({
                    id: listing.host
                });

                if (!host || !host.walletId) {
                    throw new Error(
                        "the host either cannot be found or is not connected with Stripe"
                    );
                }

                await Stripe.charge(totalPrice, source, host.walletId);

                const newBooking: Booking = {
                    id: crypto.randomBytes(16).toString("hex"),
                    listing: listing.id,
                    tenant: viewer.id,
                    checkIn,
                    checkOut
                };

                const insertedBooking = await db.bookings.create(newBooking).save();

                host.income = host.income + totalPrice;
                await host.save();

                viewer.bookings.push(insertedBooking.id);
                await viewer.save();

                listing.bookingsIndex = bookingsIndex;
                listing.bookings.push(insertedBooking.id);
                await listing.save();

                // return newly inserted booking
                return insertedBooking;

            } catch (err) {
                throw new Error(`Failed to create booking - ${err}`);
            }
        }
    },
    Booking: {
        // (a)
        listing: (
            booking: Booking,
            _args: {},
            { db }: { db: Database }
        ) => {
            return db.listings.findOne({ id: booking.listing });
        },
        tenant: (
            booking: Booking,
            _args: {},
            { db }: { db: Database }
        ) => {
            return db.users.findOne({
                id: booking.tenant
            });
        }
    }
};

/*
(a)
additional explicit resolver function required
    in the /user/:id page -> upon querying for a booking object 
    it is expected that a listing field is also queried; that is,
    a listing obj summarizing the listing details of a booking
        in booking doc of db, listing is stored as an id value
        in the client, however, a listing obj is expected
    Therefore, a resolver for the listing field is required as
    the additional explicit resolver
        this will find a single listing document from the listings
        collection where the val of listing.id === id value of 
        the booking.listing field 
*/