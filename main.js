const app = require('electron').app,
    ipc = require('electron').ipcMain,
    dialog = require('electron').dialog,
    BrowserWindow = require('electron').BrowserWindow;
const fs = require('fs'),
    path = require('path');

let win;

function createWindow() {
    // 创建浏览器窗口
    win = new BrowserWindow({
        minWidth: 1366,
        minHeight: 768,
        width: 1370,
        height: 770,
        autoHideMenuBar: true,
        icon: __dirname + "/src/logo.png",
        webPreferences: {
            nodeIntegration: true
        },
        //frame: false
    });

    // 加载index
    win.loadFile(__dirname + '/open.html');


}

// 初始化完成并且准备好创建浏览器窗口

app.whenReady().then(createWindow);

// 当所有窗口都被关闭后退出
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // 重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Main Window
ipc.on('start', function(event) {
    try {
        fs.writeFileSync(path.normalize(__dirname + "/writecheck.test"), "test");
        fs.unlinkSync(path.normalize(__dirname + "/writecheck.test"));
        var data = JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/list.json")));
        if (data.first == 0) {
            data.first = 1;
            fs.writeFileSync(path.normalize(__dirname + "/data/list.json"), JSON.stringify(data));
            event.sender.send('update-log');
        }

    } catch (err) {
        error_tips("无法进行读写，请检查权限！", err);
    }

    event.sender.send('update-list', JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/list.json"))));
});

ipc.on('remove', function(event, id) {
    const options = {
        type: 'info',
        title: '信息',
        message: "您确定删除该笔记吗？",
        buttons: ['删除', '取消']
    };
    if (dialog.showMessageBoxSync(options) == 0) {
        var info = JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/list.json")));
        for (let i = 0; i < info.list.length; i++) {
            if (info.list[i].id == id) {
                fs.unlinkSync(path.normalize(info.list[i].path));
                info.list.splice(i, 1);
                fs.writeFileSync(path.normalize(__dirname + "/data/list.json"), JSON.stringify(info));
                event.sender.send('update-list', info);
            }
        }
    }
})

ipc.on('change-note', function(event, id) {
    try {
        var info = JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/list.json")));
        if (id != "no") {
            for (let i = 0; i < info.list.length; i++) {
                if (info.list[i].id == id) {
                    var data = fs.readFileSync(info.list[i].path).toString();
                    event.sender.send('note-change', info.list[i].title, data, id, info.list[i].date);
                }
            }
        } else {
            event.sender.send('note-change', "未命名笔记", "", "no");
        }
    } catch (err) {
        error_tips("unknown", err);
        var info = JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/list.json")));
        for (let i = 0; i < info.list.length; i++) {
            if (info.list[i].id == id) {
                info.list.splice(i, 1);
                fs.writeFileSync(path.normalize(__dirname + "/data/list.json"), JSON.stringify(info));
                event.sender.send('update-list', info);
            }
        }
    }
})

ipc.on('save', function(event, text, id, title) {
    var info = JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/list.json")));
    if (id == "no") {
        const options = {
            title: '保存文件',
            defaultPath: title,
            filters: [
                { name: 'Markdown 档案', extensions: ['md'] }
            ]
        }
        dialog.showSaveDialog(options)
            .then(result => {
                var id = info.list.length;
                fs.writeFileSync(path.normalize(result.filePath), text);
                info.list.push({
                    "title": title,
                    "path": result.filePath,
                    "id": id,
                    "date": new Date().toLocaleDateString()
                });
                fs.writeFileSync(path.normalize(__dirname + "/data/list.json"), JSON.stringify(info));
                event.sender.send('save-end', id);
                event.sender.send('update-list', JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/list.json"))));
            }).catch(err => {
                console.log(err)
            })
    } else {
        for (let i = 0; i < info.list.length; i++) {
            if (info.list[i].id == id) {
                info.list[i].title = title;
                fs.writeFileSync(path.normalize(__dirname + "/data/list.json"), JSON.stringify(info));
                fs.writeFileSync(path.normalize(info.list[i].path), text);
                event.sender.send('update-list', JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/list.json"))));
            }
        }
    }
})

// Management Window
ipc.on('management-start', function(event) {
    var data = JSON.parse(fs.readFileSync(path.normalize(__dirname + "/data/list.json")));
    event.sender.send('data-list', data);
})


// Function

function error_tips(errcode, err) {
    dialog.showMessageBoxSync({
        type: 'error',
        title: '错误',
        message: "抱歉，雨晴发生了一些意外。\n错误代码：" + errcode + "\n原因：" + err,
        buttons: ['确定']
    });
    fs.writeFileSync(path.normalize(__dirname + "/log/" + new Date().valueOf() + ".txt"), "Something is wrong:\n" + err);
}