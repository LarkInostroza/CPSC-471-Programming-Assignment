// Prompt the user
import fs from "node:fs";
import { createConnection, createServer } from "node:net";
import { stdout } from "node:process";
const serverName = process.argv[2];
const port = process.argv[3];

if (serverName == null || port == null) {
  console.error("Error: Please use node <server_name> <port>");
  process.exit(1);
}

console.log({ serverName, port });

// create control socket and connect to ftp server
const client = createConnection(port, serverName, () => {
  console.log("initial control socket port: ", client.address().port);
  console.log(`connection sucessfully established to ${serverName}:${port}`);

  process.stdout.write("ftp>");

  //receive cli input
  process.stdin.on("data", (data) => {
    const input = data.toString().trim();
    const [cmd, ...args] = input.split(" ");
    if (cmd == "quit" || cmd == "q" || cmd == "exit") {
      console.warn("Exiting...");
      process.exit(0);
    }

    console.log({ cmd, args });
    if (cmd == "ls") {
      handleLs(cmd, args);
    } else if (cmd == "put") {
      handlePut(cmd, args);
    } else if (cmd == "get") {
      handleGet(cmd, args);
    } else {
      process.stdout.write("ftp>");
    }
  });
});

function handleLs(cmd, args) {
  const dataChannel = createServer((socket) => {
    console.log(`${cmd}: data channel created`);

    socket.on("data", (chunck) => {
      const fileList = chunck.toString().split(",");
      console.table(fileList);
    });

    socket.on("end", () => {
      console.log("ls data channel ended");
      dataChannel.close();
    });
    socket.on("error", (err) => {
      console.error("Error in ls data channel:", err.message);
    });
  });
  dataChannel.on("close", () => {
    console.log("ls data channel closed");
    process.stdout.write("ftp>");
  });

  // Listen to unassigned port and send info to the FTP server
  dataChannel.listen(0, () => {
    const addr = dataChannel.address();
    const port = addr.port;
    console.log(typeof port);

    client.write(`${cmd} ${port}`, "utf-8");
    console.log("Data channel listening on port ", port);
  });
}

function handlePut(cmd, args) {
  const fileName = args[args.length - 1];
  const filePath = `./client-files/${fileName}`;
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const dataChannel = createServer((socket) => {
      console.log("PUT data channel created");

      socket.write(fileBuffer, (err) => {
        if (err != undefined) {
          console.error(`${cmd} command error`, err.message);
          socket.destroy();
          dataChannel.end();
          throw err;
        } else {
          console.log(`${cmd}: SUCCESS`);
          socket.end();
          dataChannel.close();
        }
      });

      socket.on("end", () => {
        console.log(`${cmd}: data channel ended`);
        dataChannel.close();
      });
      socket.on("error", (err) => {
        console.error(`Error ${cmd} ls data channel:`, err.message);
        throw err;
      });
    });
    dataChannel.on("close", () => {
      console.log(`${cmd}: data channel closed`);
      process.stdout.write("ftp>");
    });

    // Listen to unassigned port and send info to the FTP server
    dataChannel.listen(0, () => {
      const addr = dataChannel.address();
      const port = addr.port;

      client.write(`${cmd} ${fileName} ${port}`);
      console.log(`${cmd}: data channel listening on port `, port);
    });
  } catch (error) {
    console.error(`${cmd} Error: `, error.message);
    process.stdout.write("ftp>");
  }
}

function handleGet(cmd, args) {
  const fileName = args[args.length - 1];
  const filePath = `./client-files/${fileName}`;
  let writeStream;
  try {
    const dataChannel = createServer((socket) => {
      socket.on("data", (chunck) => {
        const header = chunck.slice(0, 7).toString(); // check if fail header was sent
        // check if server sent an err msg
        if (header.startsWith("@@FAIL:")) {
          console.error(`${cmd}: server error: ${chunck}`);
          dataChannel.close();
          return;
        }
        console.log(chunck);

        // init writeStream once in case of multiple chuncks
        if (!writeStream) {
          writeStream = fs.createWriteStream(filePath);
        }

        writeStream.write(chunck, (err) => {
          if (err) {
            console.error(`${cmd}: data channel chunck error ${err.meessage}`);
          }
        });
      });

      socket.on("end", () => {
        console.log(`${cmd}: data channel ended`);
        if (writeStream) {
          writeStream.end();
        }
        dataChannel.close();
      });
      socket.on("close", (err) => {
        if (err) {
          console.error(`${cmd}: FAIL`);
        }
        if (writeStream) {
          writeStream.end();
        }
      });
      socket.on("error", (err) => {
        console.error(`Error ${cmd} get data channel:`, err.message);
      });
    });

    dataChannel.on("close", () => {
      console.log(`${cmd}: data channel closed`);
      process.stdout.write("ftp>");
    });

    // handle err if server DC etc
    dataChannel.on("error", (err) => {
      console.error(`${cmd}: FAIL: ${err.message}`);
    });

    // Listen to unassigned port and send info to the FTP server
    dataChannel.listen(0, () => {
      const addr = dataChannel.address();
      const port = addr.port;

      client.write(`${cmd} ${fileName} ${port}`);
      console.log(`${cmd}: data channel created on port `, port);
    });
  } catch (error) {
    console.error(`${cmd} Error: `, error.message);
    process.stdout.write("ftp>");
  }
}

client.on("error", (err) => {
  console.error(`Error: client socket error ${err.message}`);
});

client.on("close", () => {
  console.error(`Can't reach server`);
});

client.on("data", (data) => {});
