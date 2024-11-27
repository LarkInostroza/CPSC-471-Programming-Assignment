import socket
import os
import sys

#Send a command to the server and wait for a response.
def send_command(control_socket, command):
    control_socket.sendall(command.encode())
    response = control_socket.recv(1024).decode()
    return response

#ls command.
def handle_ls(control_socket):
    response = send_command(control_socket, "ls")
    print("Server response:\n", response)

#get command to download a file.
def handle_get(control_socket, filename):
    response = send_command(control_socket, f"get {filename}")
    if response.startswith("FAIL"):
        print("Server error:", response)
        return

    #Establish a data connection
    data_port = int(response)
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as data_socket:
        data_socket.connect((server_name, data_port))
        with open(filename, "wb") as file:
            while True:
                data = data_socket.recv(1024)
                if not data:
                    break
                file.write(data)
    print(f"File '{filename}' downloaded successfully.")

#put command to upload a file.
def handle_put(control_socket, filename):
    if not os.path.exists(filename):
        print(f"File '{filename}' not found.")
        return

    response = send_command(control_socket, f"put {filename}")
    if response.startswith("FAIL"):
        print("Server error:", response)
        return

    #Create a data connection
    data_port = int(response)
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as data_socket:
        data_socket.connect((server_name, data_port))
        with open(filename, "rb") as file:
            while chunk := file.read(1024):
                data_socket.sendall(chunk)
    print(f"File '{filename}' uploaded successfully.")


#Main FTP client.
def ftp_client(server_name, server_port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as control_socket:
        control_socket.connect((server_name, server_port))
        print("Connected to FTP server.")
        while True:
            command = input("ftp> ").strip()
            if command == "quit":
                send_command(control_socket, "quit")
                print("Disconnected from the server.")
                break
            elif command == "ls":
                handle_ls(control_socket)
            elif command.startswith("get "):
                filename = command.split(" ", 1)[1]
                handle_get(control_socket, filename)
            elif command.startswith("put "):
                filename = command.split(" ", 1)[1]
                handle_put(control_socket, filename)
            else:
                print("Invalid command. Supported commands: ls, get <filename>, put <filename>, quit.")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python FTP-Client.py <server_name> <server_port>")
        sys.exit(1)

    server_name = sys.argv[1]
    server_port = int(sys.argv[2])
    ftp_client(server_name, server_port)
