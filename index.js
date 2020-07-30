import { PubSub } from 'graphql-subscriptions';
import { createServer } from 'http';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { execute, subscribe } from 'graphql';
import { readFileSync } from "fs";
import { makeExecutableSchema } from 'graphql-tools';
import resolvers, {validateToken} from "./resolvers";
import { setupDB } from "./db";

require("dotenv").config();

export const pubsub = new PubSub();
const WS_PORT = 5000;
const typeDefs = readFileSync("./schema.graphql", "utf-8");

export let db;

async function setup() {

    const websocketServer = createServer((request, response) => {
        response.writeHead(404);
        response.end();
    });

    websocketServer.listen(WS_PORT, () => console.log(
        `Websocket Server is now running on port ${WS_PORT}`
    ));


    db = await setupDB();

    const schema = makeExecutableSchema({
        typeDefs,
        resolvers
    });

    SubscriptionServer.create(
        {
            schema,
            execute,
            subscribe,
            onConnect: (connectionParams) => {
                return validateToken(connectionParams.authID)
                    .then(user => {
                        return {
                            currentUser: user,
                        };
                    });
            }
        },
        {
            server: websocketServer,
            path: '/graphql',
        },
    );
}

setup();

process.on('SIGINT', () => db.close());
process.on('SIGTERM', () => db.close());
