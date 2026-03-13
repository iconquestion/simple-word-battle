/**
 * WordBattle 服务
 * 作者: iconquestion
 * 用途: 一个Node.js HTTP服务，帮助学生学习英文单词。Excel文件(db.xlsx)包含单词数据库。
 * 版本: 20260313
 */

const xlsx = require('node-xlsx').default;
const http = require('http');
const fs = require('fs');
const winston = require('winston');

// 配置Winston日志
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: () => new Date().toUTCString() }),
        winston.format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] ${message}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'info.log', level: 'info' }),
        new winston.transports.File({ filename: 'error.log', level: 'error' })
    ]
});

const SERVER_PORT = 8080;
const RANDOM_WORD_COUNT = 4;
const ALTERNATIVE_WORD_COUNT = 3;
const WORD_COLUMN_INDEX = 1; // 单词在Excel中的列索引（从0开始）

let wordDatabase = null;

// 在启动时加载Excel数据
try {
    if (fs.existsSync('db.xlsx')) {
        const workbook = xlsx.parse('db.xlsx');
        wordDatabase = workbook[0].data;
        logger.info(`Excel数据加载成功。总行数: ${wordDatabase.length}`);
    } else {
        logger.error('db.xlsx 未找到。服务器将无法正常运行。');
        process.exit(1);
    }
} catch (error) {
    logger.error(`加载Excel文件时出错: ${error.message}`);
    process.exit(1);
}

const service = http.createServer();
service.listen(SERVER_PORT, () => {
    logger.info(`服务器已在端口 ${SERVER_PORT} 启动`);
});

// 主要的请求处理器
service.on('request', (request, response) => {
    logger.info(`${request.method} ${request.url}`);

    try {
        const parsedUrl = new URL('http://hello.world' + request.url);
        const requestMode = parsedUrl.searchParams.get('mode');

        switch (requestMode) {
            case 'random':
                getRandomWords(response);
                break;
            case 'manual':
                getManualWords(parsedUrl, response);
                break;
            default:
                sendJsonResponse(response, 200, {
                    code: 400,
                    msg: '缺少必要参数: mode，或参数不正确'
                });
        }
    } catch (error) {
        logger.error(`处理请求时出错: ${error.message}`);
        sendJsonResponse(response, 500, {
            code: 500,
            msg: '内部服务器错误'
        });
    }
});

/**
 * 处理随机单词选择
 * @param {Object} response - HTTP响应对象
 */
function getRandomWords(response) {
    const totalWords = wordDatabase.length;
    const selectedWords = {};
    const usedIndices = new Set();

    for (let i = 0; i < RANDOM_WORD_COUNT; i++) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * totalWords);
        } while (usedIndices.has(randomIndex));
        usedIndices.add(randomIndex);
        selectedWords[i] = wordDatabase[randomIndex];
    }

    sendJsonResponse(response, 200, {
        code: 200,
        data: selectedWords
    });
}

/**
 * 处理手动单词选择（通过搜索或索引）
 * @param {URL} parsedUrl - 解析后的URL对象
 * @param {Object} response - HTTP响应对象
 */
function getManualWords(parsedUrl, response) {
    const searchWord = parsedUrl.searchParams.get('searchfor');
    const indexString = parsedUrl.searchParams.get('index');

    if (searchWord) {
        searchWordHandler(searchWord, response);
    } else if (indexString) {
        getWordByIndex(indexString, response);
    } else {
        sendJsonResponse(response, 200, {
            code: 400,
            msg: '缺少必要参数，或参数不正确'
        });
    }
}

/**
 * 搜索特定单词并返回它以及随机替代单词
 * @param {string} searchWord - 要搜索的单词
 * @param {Object} response - HTTP响应对象
 */
function searchWordHandler(searchWord, response) {
    const totalWords = wordDatabase.length;
    let foundWord = null;

    // 在第二列搜索单词（假设单词在列1，索引1）
    for (const wordEntry of wordDatabase) {
        if (wordEntry[WORD_COLUMN_INDEX] === searchWord) {
            foundWord = wordEntry;
            break;
        }
    }

    if (!foundWord) {
        sendJsonResponse(response, 200, {
            code: 404,
            msg: '404 未找到'
        });
        return;
    }

    const result = { 0: foundWord };
    // 添加3个随机单词，确保与找到的单词不重复
    const usedIndices = new Set([wordDatabase.indexOf(foundWord)]);
    for (let i = 0; i < ALTERNATIVE_WORD_COUNT; i++) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * totalWords);
        } while (usedIndices.has(randomIndex));
        usedIndices.add(randomIndex);
        result[i + 1] = wordDatabase[randomIndex];
    }

    sendJsonResponse(response, 200, {
        code: 200,
        data: result
    });
}

/**
 * 通过索引处理单词选择
 * @param {string} indexString - 索引参数字符串
 * @param {Object} response - HTTP响应对象
 */
function getWordByIndex(indexString, response) {
    const wordIndex = parseInt(indexString, 10);
    if (isNaN(wordIndex) || wordIndex < 0) {
        sendJsonResponse(response, 200, {
            code: 400,
            msg: '参数 index 的类型不正确'
        });
        return;
    }

    const totalWords = wordDatabase.length;
    if (wordIndex >= totalWords) {
        sendJsonResponse(response, 200, {
            code: 400,
            msg: `超出索引上限: ${totalWords}`
        });
        return;
    }

    const result = { 0: wordDatabase[wordIndex] };
    // 添加3个随机单词，确保与选择的单词不重复
    const usedIndices = new Set([wordIndex]);
    for (let i = 0; i < ALTERNATIVE_WORD_COUNT; i++) {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * totalWords);
        } while (usedIndices.has(randomIndex));
        usedIndices.add(randomIndex);
        result[i + 1] = wordDatabase[randomIndex];
    }

    sendJsonResponse(response, 200, {
        code: 200,
        length: totalWords,
        data: result
    });
}

/**
 * 发送JSON响应并设置适当的头部
 * @param {Object} response - HTTP响应对象
 * @param {number} status - HTTP状态码
 * @param {Object} data - 要发送的JSON数据
 * @param {Object} [additionalHeaders] - 额外的响应头部
 */
function sendJsonResponse(response, status, data, additionalHeaders = {}) {
    const headers = {
        'Content-Type': 'application/json;charset=UTF-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
        ...additionalHeaders
    };

    response.writeHead(status, headers);
    response.write(JSON.stringify(data));
    logger.info(`响应已发送。状态: ${status}, 内容: ${JSON.stringify(data)}`);
    response.end();
}


