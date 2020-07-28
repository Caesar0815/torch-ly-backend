import { ObjectId } from "mongodb";
import { GraphQLScalarType } from "graphql";
import { Kind } from "graphql/language";
import {db, pubsub} from "./index";

import {
    URLResolver,
    JSONResolver
} from 'graphql-scalars';

export const resolvers = {
    Query: {
        // Players
        allPlayers: async (parent, args) => await db.collection("players").find().toArray(),
        totalPlayers: async (parent, args) => await db.collection("players").estimatedDocumentCount(),
        getPlayerByID: async (parent, args) => await db.collection("players").findOne(ObjectId(args.id)),

        // Characters
        allCharacters: async (parent, args) => {
            return await db.collection("characters").aggregate([
                {
                    "$lookup": {
                        "from": "players",
                        "localField": "players",
                        "foreignField": "_id",
                        "as": "players"
                    }
                }
            ]).toArray();
        },
        totalCharacters: async (parent, args) => await db.collection("characters").estimatedDocumentCount(),
        getCharacterByID: async (parent, args) => (await db.collection("characters").aggregate([
            {
                $match: {
                    _id: ObjectId(args.id)
                }
            },{
                "$lookup": {
                    "from": "players",
                    "localField": "players",
                    "foreignField": "_id",
                    "as": "players"
                }

            }
        ]).toArray())[0],

        // Measurements
        allMeasurements: async (parent, args) => await db.collection("measurement").find().toArray(),
        totalMeasurements: async (parent, args) => await db.collection("measurement").estimatedDocumentCount(),
        getMeasurementsByID: async (parent, args) => await db.collection("measurement").findOne(ObjectId(args.id))

    },
    Mutation: {
        addCharacter: async (parent, args) => {
            let character = {
                ...args,
            };

            character.token = character.token.href;
            for (let i in character.players) {
                character.players[i] = ObjectId(character.players[i]);
            }

            const { insertedIds } = await db.collection("characters").insertOne(character);
            character.id = insertedIds;

            return character;
        },
        updateCharacterPosition: async (parent, args) => {
            let character = (await db.collection("characters").findOneAndUpdate(
                { _id: ObjectId(args.id)},
                {
                    $set: { "pos.point.x": args.x, "pos.point.y": args.y},
                },
                {returnOriginal: false}
            )).value;

            pubsub.publish("character-update", {updateCharacter:character});

            return character;
        }
    },
    Subscription: {
        updateCharacter: {
            subscribe: () => pubsub.asyncIterator("character-update")
        }
    },
    Player: {
        id: parent => parent.id || parent._id,
        gm: parent => process.env.GM.includes(parent.id || parent._id),
        characters: async (parent, args) => await db.collection("characters").find({
            players: {
                $in: [parent.id || parent._id]
            }
        }).toArray()
    },
    Character: {
        id: parent => parent.id || parent._id,
        players: async (parent, args) => {
            if (parent.players.length === 0)
                return parent.players;

            let res =  typeof parent.players[0].name != "undefined" ? parent.players :
            await db.collection("players").find({
                "_id": {
                    $in: parent.players.map(p => {
                        return ObjectId(p);
                    })
                }
            }).toArray();
            return res
        }
    },
    PositionSquare: {
        rot: parent => parent.rot || 0,
        size: parent => parent.size || 1
    },
    URL: URLResolver,
    JSON: JSONResolver
};
