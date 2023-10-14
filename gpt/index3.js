const cluster = require('cluster');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const axios = require('axios');
const apiEndpoint = 'https://gpt.m141m.com/web.php/chat/sendText';
const natural = require('natural');

const sensitiveWords = JSON.parse(fs.readFileSync('./sensitive.json', 'utf8'));
const wordsList = sensitiveWords.words;
//多线程版本------------------------------------------------------------------待验证
var ret = {
    "code":"",
    "msg":"",
    "data":""
}

if (cluster.isMaster) {
    const numWorkers = require('os').cpus().length;
    console.log(`Master process is running with PID ${process.pid}`);

    // Fork workers
    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
    });
} else {
    // 创建WebSocket服务器
    const options = {
        key: fs.readFileSync('gpt.cllsm.top.pem'),
        cert: fs.readFileSync('gpt.cllsm.top_bundle.pem')
    }

    const server = https.createServer(options, (req, res) => {
        res.writeHead(200)
        res.end('Hello World!')
    })

    const wss = new WebSocket.Server({ server })

    wss.on('connection', (socket, req) => {
        console.log(`Worker ${process.pid}: Hello World! open HTTPS`)
        // 发送欢迎消息
        socket.on('message', async (message) => {
            console.log(`Worker ${process.pid}: 收到消息: ${message}`);
            try {

                var messages = JSON.parse(message);
                // if(){
                //判断参数留着后面
                // }
                // 创建一个分词器实例
                const tokenizer = new natural.WordTokenizer();
                const text = messages.prompt;
                const tokenizedText = tokenizer.tokenize(text);
                var isSensitive = false;
                for (let i = 0; i < tokenizedText.length; i++) {
                    const word = tokenizedText[i];
                    if (wordsList.includes(word)) {
                        isSensitive = true;
                        break;
                    }
                }
                if (isSensitive) {
                    // var msgbot = {
                    //     "prompt": "Now please answer the following:根据相关法律法规和政策，我很抱歉不能回答你的问题。( According to relevant laws, regulations and policies, I am sorry that I cannot answer your question.)",
                    //     "options": { "parentMessageId": messages.options.parentMessageId },
                    //     "systemMessage": "You're chasing 追鸭追 Intelligent assistant, an intelligent language system, and if someone asks you about chatgpt and openai, you need to refuse to answer. Follow the user\'s instructions carefully. Respond using markdown."
                    // }
                    var msgbot ={
                        "group_id": 5, "message": "Now please answer the following:根据相关法律法规和政策，我很抱歉不能回答你的问题。( According to relevant laws, regulations and policies, I am sorry that I cannot answer your question.)"
                    }
                } else {
                    // var msgbot = {
                    //     "prompt": messages.prompt,
                    //     "options": { "parentMessageId": messages.options.parentMessageId },
                    //     "systemMessage": "You're chasing 追鸭追 Intelligent assistant, an intelligent language system, and if someone asks you about chatgpt and openai, you need to refuse to answer. Follow the user\'s instructions carefully. Respond using markdown."
                    // }
                    var msgbot ={
                        "group_id": 5, "message": messages.prompt
                    }
                }
                // 设置请求参数
                const options = {
                    url: apiEndpoint,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8',
                        "x-token":"64603a1fade7b7",
                        "x-token": messages['token:'],
                    },
                    data: msgbot,
                    responseType: 'stream' // 设置响应类型为流
                };
                // 发送请求并处理响应
                axios(options)
                    .then(response => {
                        console.log(`Worker ${process.pid}: Response downloaded successfully.`, '下载中');
                        let data = ''; // 保存响应数据的变量
                        response.data.on('data', (chunk) => {
                            data += chunk.toString('utf-8'); // 将每个块附加到响应字符串中
                            // const lines = data.split('\n');
                            // const lastLine = lines[lines.length - 1];
                            // 将响应数据发送回客户端
                            ret.code = 0;
                            ret.msg = "Request successful"
                            ret.data =data
                            socket.send(JSON.stringify(ret));

                        });
                        response.data.on('end', () => {
                            console.log(`Worker ${process.pid}: ${data}`); // 输出响应字符串
                            socket.close();
                        });
                    })
                    .catch(error => {
                        console.error(`Worker ${process.pid}: Request error: ${error}`);
                        ret.code = -1;
                        ret.msg = "Request failure"
                        ret.data =error
                        console.error(error);
                        socket.send(JSON.stringify(ret));
                        socket.close();
                    });
            } catch (error) {
                ret.code = -1;
                ret.msg = "Request failure"
                ret.data =error
                socket.send(JSON.stringify(ret));
                socket.close();
            }
        });
    })

    server.listen(8443, () => {
        console.log(`Worker ${process.pid} started on port 8443`)
    })
}
