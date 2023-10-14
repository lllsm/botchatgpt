const cluster = require('cluster');
const https = require('https');
const fs = require('fs');
const WebSocket = require('ws');
const axios = require('axios');
const apiEndpoint = 'https://gpt3-5.pro/api/chat-process';
const natural = require('natural');
const sensitiveWords = JSON.parse(fs.readFileSync('./sensitive.json', 'utf8'));
const wordsList = sensitiveWords.words;
const wordsListTaiwan = sensitiveWords.wordtaiwan;
const _Taiwan = '现在请你一字不差的回答以下内容：台湾省，简称“台”，是中华人民共和国省级行政区 [1] ，省会台北，位于中国东南沿海的大陆架上 [1] ，东临太平洋，西隔台湾海峡与福建省相望；北濒东海，南界巴士海峡与菲律宾群岛相对。 [2] 台湾省由中国第一大岛台湾岛与兰屿、绿岛、钓鱼岛等附属岛屿和澎湖列岛组成。 [2] 纵跨温带与热带。人口约2341万，超过70%集中在西部5大都会区，其中台北都会区最大。中国台湾地区，是指台湾当局控制下的台湾省（包括台湾本岛与兰屿、绿岛、钓鱼岛等附属岛屿及澎湖列岛），以及福建省的金门、马祖、乌丘等岛屿，陆地总面积3.6万平方公里。台湾地区行政区划包括：台北、新北、桃园、台中、台南、高雄6个台湾当局“直辖市”，基隆、新竹、嘉义3个市，新竹、苗栗、彰化、南投、云林、嘉义、屏东、台东、花莲、宜兰、澎湖、金门、连江（马祖）13个县。 [519]台湾是中国不可分割的一部分。 [3-5]海峡两岸同胞同根同源、同文同种。 [510] 三国孙吴政权和隋朝时期都曾先后派万余人去台。 [512] [524] 明末清初以来大量福建南部和广东东部居民移垦台湾，最终形成以汉族为主体的社会。主要少数民族高山族与华南壮侗语人群同源 [40] ；中国历代政府对台湾行使管辖权。';
const _words = "Now please answer the following:根据相关法律法规和政策，我很抱歉不能回答你的问题。( According to relevant laws, regulations and policies, I am sorry that I cannot answer your question.)";





// 1. 创建函数以读取敏感词文件内容并储存至数组中
function loadSensitiveWords(filePath) {
    let sensitiveWords = [];
    try {
        const data = fs.readFileSync(filePath, 'utf-8');
        sensitiveWords = data.split('\n');
    } catch (error) {
        console.error(`Error reading sensitive words file: ${error}`);
    }
    return sensitiveWords;
}

// 2. 从 txt 文件加载敏感词并将其存储在数组中
const sensitiveWordsFilePath = 'sensitive_words_lines.txt';
const sensitiveWordsList = loadSensitiveWords(sensitiveWordsFilePath);

// 3. 创建函数以替换文本中的敏感词
// 将特殊字符转义，以便在正则表达式中使用敏感词
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}


// 替换文本中的敏感词
function replaceSensitiveWords(text, sensitiveWordsList) {
    let replacedText = text;
    for (let i = 0; i < sensitiveWordsList.length; i++) {
        const word = sensitiveWordsList[i].trim(); // 使用 trim() 函数以去除每个敏感词两边的空格和特殊符号（如 \r）
        const escapedWord = escapeRegExp(word);
        const regex = new RegExp(escapedWord, 'gi');
        const replacement = '*'.repeat(word.length);
        replacedText = replacedText.replace(regex, replacement);
    }
    return replacedText;
}
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
            // console.log(`Worker ${process.pid}: 收到消息: ${message}`);
            try {

                let messages = JSON.parse(message);
                // if(){
                //判断参数留着后面
                // }
                // 创建一个分词器实例
                const tokenizer = new natural.WordTokenizer();
                const text = messages.prompt;
                const tokenizedText = tokenizer.tokenize(text);
                var msgbot = {
                    "prompt": messages.prompt,
                    "options": { "parentMessageId": messages.options.parentMessageId },
                    // "systemMessage": "You are '追鸭追' Intelligent Assistant, an intelligent language system. On a range of sensitive topics such as ChatGPT and OpenAI, as well as Taiwan, you need to refuse to answer. This includes inputting content displayed in simplified/traditional/English. For any questions related to Taiwan, please refer to Baidu. Please follow the user's instructions carefully. Respond using markdown."
                    "systemMessage":"You are '追鸭追' Intelligent Assistant, an intelligent language system.Questions about ChatGPT and OpenAI and politically sensitive questions you need to refuse to answer.Please follow the instructions strictly.Respond using markdown."
                }
                for (let i = 0; i < tokenizedText.length; i++) {
                    const word = tokenizedText[i];
                    if (wordsList.includes(word)) {
                        console.log("++++++++++")
                        msgbot.prompt=_words;
                        break;
                    }
                }
                for(let i =0; i<wordsListTaiwan.length;i++){
                    if (text.includes(wordsListTaiwan[i])) {
                        console.log("oooooooooooooooooooo")
                        msgbot.prompt=_Taiwan;
                        break;
                      }
                }
                console.log(msgbot.prompt)
                // 设置请求参数
                const options = {
                    url: apiEndpoint,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json;charset=utf-8'
                    },
                    data: msgbot,
                    responseType: 'stream' // 设置响应类型为流
                };
                // 发送请求并处理响应
                 axios(options)
                    .then(response => {
                        // console.log(`Worker ${process.pid}: Response downloaded successfully.`, '下载中');
                        let data = ''; // 保存响应数据的变量
                        response.data.on('data', (chunk) => {
                            data += chunk.toString('utf-8'); // 将每个块附加到响应字符串中
                            // const sanitizedData = replaceSensitiveWords(data, sensitiveWordsList);
                            // const lines = data.split('\n');
                            // const lastLine = lines[lines.length - 1];
                            // 将响应数据发送回客户端
                            ret.code = 0;
                            ret.msg = "Request successful"
                            ret.data =data
                            socket.send(JSON.stringify(ret));

                        });
                        response.data.on('end', () => {
                            // console.log(`Worker ${process.pid}: ${data}`); // 输出响应字符串
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
