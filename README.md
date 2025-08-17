# Server-Based Video Silence Remover

This project uses a Node.js backend to handle video processing, allowing it to work with much larger files than a purely browser-based solution.

## Prerequisites

1.  **Node.js:** You must have Node.js installed on your computer. You can download it from [nodejs.org](https://nodejs.org/).
2.  **FFmpeg:** The server depends on FFmpeg being installed on the system.
    * **Windows:** Follow this [guide to install FFmpeg](https://www.geeksforgeeks.org/how-to-install-ffmpeg-on-windows/).
    * **macOS:** Open Terminal and run `brew install ffmpeg`.
    * **Linux:** Open your terminal and run `sudo apt update && sudo apt install ffmpeg`.

    You must ensure that the `ffmpeg` command is accessible from your command line/terminal.

## Project Structure

Create the following folder and file structure:


/video-silence-remover/
|-- /public/
|   |-- index.html
|   |-- script.js
|   |-- style.css
|-- server.js
|-- package.json


## How to Run

1.  **Navigate to Project Folder:** Open your terminal or command prompt and navigate into the `video-silence-remover` directory.

2.  **Install Dependencies:** Run the following command to install the necessary Node.js packages defined in `package.json`:
    ```bash
    npm install
    ```

3.  **Start the Server:** Run the following command to start the backend server:
    ```bash
    node server.js
    ```
    You should see a message in your terminal: `Server is running at http://localhost:3000`.

4.  **Open the Webpage:** Open your web browser and go to the following address:
    [http://localhost:3000](http://localhost:3000)

The application is now running locally on your machine!

---

## `package.json`

Save the following content as `package.json` in the root of your project folder.

```json
{
  "name": "video-silence-remover-server",
  "version": "1.0.0",
  "description": "A server-based application to remove silence from videos.",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "author": "deetalk",
  "license": "ISC",
  "dependencies": {
    "@ffmpeg-installer/ffmpeg": "^1.1.0",
    "express": "^4.18.2",
    "fluent-ffmpeg": "^2.1.2",
    "multer": "^1.4.5-lts.1"
  }
}
