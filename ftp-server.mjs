import net, { createConnection, SocketAddress } from "node:net";
import fs from "node:fs";

let port = process.argv[2];
if (port == undefined) {
  port = 1025;
  console.log("port missing... default port will be used");
}
const server = net.createServer((socket) => {
  console.log(`Sucessful connection from: ${socket.remoteAddress}`);

  socket.on("data", (data) => {
    const input = data.toString("utf-8").trim();
    const [cmd, ...args] = input.split(" ");

    // dataConnection port always last arg
    if (cmd == "ls") {
      handleLs(cmd, socket.remoteAddress, args, socket);
    } else if (cmd == "put") {
      handlePut(cmd, socket.remoteAddress, args, socket);
    } else if (cmd == "get") {
      fs.existsSync();
      handleGet(cmd, socket.remoteAddress, args, socket);
    } else {
      console.error(`${cmd}: FAIL: ${cmd} doesn't exist`);
    }
  });
});

function handleLs(cmd, remoteAddress, args, controlSocket) {
  const port = parseInt(args[args.length - 1]);
  console.log({ remoteAddress, port });
  const dataChannel = createConnection(port, remoteAddress, () => {
    console.log(
      `connection sucessfully established to ${remoteAddress}:${port}`
    );

    const list = fs.readdirSync("./server-files");

    dataChannel.write(list.toString(), (error) => {
      if (error != undefined) {
        console.log("cmd:ls - FAILURE", error.message);
        dataChannel.destroy();
      } else {
        dataChannel.end();
      }
    });

    dataChannel.on("close", (err) => {
      if (err) {
        controlSocket.write(`${cmd}: FAIL`);
      } else {
        controlSocket.write(`${cmd}: SUCCESS`);
      }
    });
  });
}

function handlePut(cmd, remoteAddress, args, controlSocket) {
  const port = parseInt(args[args.length - 1]);
  const fileName = args[args.length - 2];
  const filePath = `./server-files/${fileName}`;
  //TODO: Handle if file already exists
  try {
    const dataChannel = createConnection(port, remoteAddress, () => {
      console.log(`PUT connection success: ${remoteAddress}:${port}`);
      const writeStream = fs.createWriteStream(filePath);
      dataChannel.on("data", (chunck) => {
        // console.log("received", chunck);
        writeStream.write(chunck, (err) => {
          if (err != undefined) {
            console.error(`${cmd} error`, err.message);
            controlSocket.write(`${cmd} FAIL`);

            dataChannel.destroy();
          }
        });
      });
      dataChannel.on("end", () => {
        //close streams

        writeStream.end();
        dataChannel.end();
      });
      dataChannel.on("close", (err) => {
        if (err) {
          controlSocket.write(`${cmd}: FAIL`);
        } else {
          console.log(`${cmd}: SUCCESS`);
          controlSocket.write(`${cmd} SUCCESS`);
        }
      });
    });
  } catch (error) {
    controlSocket.write(`${cmd} FAIL`);
    console.error(`${cmd} ERROR: `, error.message);
    console.error(`${cmd} FAILURE: `);
  }
  console.log({ fileName });

  console.log({ remoteAddress, port });
}

function handleGet(cmd, remoteAddress, args, controlSocket) {
  const port = parseInt(args[args.length - 1]);
  const fileName = args[args.length - 2];
  const filePath = `./server-files/${fileName}`;
  try {
    // check if file exists 1st
    if (!fs.existsSync(filePath)) {
      // send error to client if file doesn't exist
      const dataChannel = createConnection(port, remoteAddress, () => {
        dataChannel.write("@@FAIL: File doesn't exist");
        dataChannel.end();
      });
      console.log(`${cmd}: FAIL: File doesn't exist`);

      return;
    }

    const fileBuffer = fs.readFileSync(filePath); // read file to buffer
    const dataChannel = createConnection(port, remoteAddress, () => {
      console.log(`${cmd} connection success: ${remoteAddress}:${port}`);
      dataChannel.write(fileBuffer, (err) => {
        if (err != undefined) {
          dataChannel.destroy();
        } else {
          dataChannel.end();
        }
      });
    });

    dataChannel.on("error", (err) => {
      console.error(`${cmd}: data channel error`, err.message);
      dataChannel.destroy(err);
    });
    dataChannel.on("close", (err) => {
      if (err) {
        console.error(`${cmd}: FAIL`);
        controlSocket.write(`${cmd} FAIL`);
      } else {
        //send success to client control socket
        controlSocket.write(`${cmd} SUCCESS`);
        console.log(`${cmd}: SUCCESS`);
      }
    });
  } catch (err) {
    console.error(`${cmd} Error: ${err.message}`);
    console.log(`${cmd}: FAIL`);
  }
}

server.listen(port, "0.0.0.0", () => {
  console.log(`Ftp server running on port ${port}...`);
});
