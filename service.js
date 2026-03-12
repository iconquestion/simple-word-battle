var xlsx = require('node-xlsx').default
var http = require('http')

//version: 20220519-1
var listen_port = 8080;
var service = http.createServer();
service.listen(listen_port)
console.log(timeString() + "服务已经启动在" + listen_port + "端口");

service.on('request', function (request, response) {
    console.log(timeString() + request.method + ' ' + request.url);

    var tempurl = new URL('http://hello.world' + request.url);
    var mode = tempurl.searchParams.get('mode')

    switch (mode) {
        case 'random': {
            //读取xlsx
            var sheetdata = xlsx.parse('test.xlsx')
            //记录sheet1的行数
            //num: 一次发送的item数量
            var length = sheetdata[0].data.length, o = {}, num = 4

            //生成num-1个随机项目，响应请求
            for (var i = 0; i < num; i++) {
                var item = sheetdata[0].data[Math.floor(Math.random() * length)]
                o[i] = item
            }

            sendJSONResponse(200, {
                'code': 200,
                'data': o
            })
            break;
        }

        case 'manual': {
            var searchfor = tempurl.searchParams.get('searchfor'), index = tempurl.searchParams.get('index')
            if (searchfor) {
                //读取xlsx
                var sheetdata = xlsx.parse('test.xlsx')
                var length = sheetdata[0].data.length
                var result = {}
                try {
                    sheetdata[0].data.forEach(function (element) {
                        if (element[1] == searchfor) {
                            result[0] = element
                            throw 'ok'
                        }
                    })

                    sendJSONResponse(200, {
                        'code': 404,
                        'msg': '404 Not Found'
                    })

                } catch (e) {
                    for (var i = 0; i < 3; i++) {
                        var ran = Math.floor(Math.random() * length)
                        result[i + 1] = sheetdata[0].data[ran == result[0][0] ? Math.floor(Math.random() * length) : ran]
                    }

                    sendJSONResponse(200, {
                        'code': 200,
                        'data': result
                    })

                }

            } else if (index) {
                if (index.search(/\D/) != -1) {
                    sendJSONResponse(200, {
                        'code': 400,
                        'msg': '参数 index 的类型不正确'
                    })
                }
                //读取xlsx
                var sheetdata = xlsx.parse('test.xlsx')
                //记录sheet1的行数
                //num: 一次发送的item数量
                var length = sheetdata[0].data.length, result = {}
                if (index >= length) {
                    sendJSONResponse(200, {
                        'code': 400,
                        'msg': '超出索引上限: ' + length
                    })
                } else {
                    result[0] = sheetdata[0].data[index]

                    for (var i = 0; i < 3; i++) {
                        var ran = Math.floor(Math.random() * length)
                        result[i + 1] = sheetdata[0].data[ran == result[0][0] ? Math.floor(Math.random() * length) : ran]
                    }

                    sendJSONResponse(200, {
                        'code': 200,
                        'length': length,
                        'data': result
                    })
                }


            } else {
                sendJSONResponse(200, {
                    'code': 400,
                    'msg': '缺少必要参数，或参数不正确'
                })
            }
            break;
        }

        default: {
            sendJSONResponse(200, {
                'code': 400,
                'msg': '缺少必要参数: mode，或参数不正确'
            })
        }
    }


    function sendJSONResponse(status, objectdata, moreHeads) {
        var responseHead = {
            'Content-Type': 'application/json;charset=UTF-8',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'no-cache'
        }

        if (moreHeads) {
            response.writeHead(status, Object.assign(responseHead, moreHeads));
        } else {
            response.writeHead(status, responseHead);
        }
        response.write(JSON.stringify(objectdata));
        console.log(timeString() + 'sendJSONResponse已发送响应。\nStatusCode: ' + status + ' \nContent: ' + JSON.stringify(objectdata) + '\nmoreHeads: ' + JSON.stringify(moreHeads))
        response.end();
        //process.exit()
    }
})

function timeString() {
    return '[' + new Date().toUTCString() + '] '
}
