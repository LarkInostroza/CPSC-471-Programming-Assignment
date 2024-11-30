## Names and Emails

* Abdulrahman Al-Yazidi, aalyazidi1@csu.fullerton.edu
* Christopher Ascencio, christopherascencio@csu.fullerton.edu
* Lark Inostroza, larkthelustrous@gmail.com

## Language Used

Javascript (Node.js runtime)

## Requirments

Node.js 22.8.0+

## How to run the server

Note: port has to be 1025+ if not admin user

```bash
node <server_file> <port>
```

## How to run the client

```bash
node <client_file> (<server_name> | <server_ip>) <port>
```

## client commands

```bash
ls
get <file_name>
put <file_name>
```

### the client will look at files on dir ./client-files

### the server will look at files on dir ./server-files

### Notes
The client performs a DNS lookup or directly connects to the provided server IP
since the server runs on the local network. 
the client can be run with the following example:
```bash
node ftp-client.mjs localhost 1025
```
or
```bash
node ftp-client.mjs 127.0.0.1 1025
```
Example server run:
```bash
node ftp-server.mjs 1025
```
