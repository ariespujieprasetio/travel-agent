import { io, Socket } from 'socket.io-client';
import readline from "readline";

// Setup readline interface for user input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});



const socket: Socket = io("http://localhost:3000", {
    transports: ["websocket"], // Optional: forces WebSocket connection
});


// rl.close();
// Helper function to prompt the user
function promptUser(question: string): Promise<string> {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

async function main() {
    while (true) {
        
        const prompt = await promptUser('> ');

        socket.emit('chat message', prompt)

        // rl.close()

        break;
        
    }
}


socket.on("connect", () => {
    console.log("Connected to server as Node.js client!");
    socket.emit('chat message', ``)

});

socket.on("chat message", (msg: string) => {
    console.log("Received chat message:", msg);
});

socket.on("msg-1", (msg: string) => {

    process.stdout.write(msg || "");

    if (msg == `\n\0`)
    {
        console.log('stop <>');

        main();
    }


});


socket.on("disconnect", () => {
    console.log("Disconnected from server");
});

// Optional: Handle connection errors
socket.on("connect_error", (error: Error) => {
    console.error("Connection error:", error);
});


